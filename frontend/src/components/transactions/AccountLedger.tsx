import { useState, useEffect, type KeyboardEvent } from 'react';
import { transactionsApi, accountsApi, budgetsApi } from '../../services/api';
import type { Transaction, Account, Budget } from '../../services/api';
import CategoryInput from '../common/CategoryInput';

interface AccountLedgerProps {
  accountId: string;
}

// Define the editable fields and their types
type EditableField = 'description' | 'category' | 'budget_id' | 'destination_name' | 'amount' | 'transaction_date';

// Interface for tracking which field is being edited
interface EditingState {
  transactionId: string;
  field: EditableField;
}

const AccountLedger = ({ accountId }: AccountLedgerProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for tracking which field is being edited
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Form state for new transaction
  const [description, setDescription] = useState('');
  const [incomingAmount, setIncomingAmount] = useState('');
  const [outgoingAmount, setOutgoingAmount] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [destinationName, setDestinationName] = useState('');
  const [budgetId, setBudgetId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Categories are now managed through the CategoryInput component

  useEffect(() => {
    const fetchData = async () => {
      if (!accountId) return;

      try {
        setLoading(true);

        // Fetch account details
        const accountData = await accountsApi.getAccount(accountId);
        setAccount(accountData);

        // Fetch all accounts for looking up names
        const allAccountsData = await accountsApi.getAccounts();
        setAllAccounts(allAccountsData);

        // Fetch transactions for this account
        const transactionsData = await transactionsApi.getAccountTransactions(accountId);
        setTransactions(transactionsData);

        // Fetch budgets
        const budgetsData = await budgetsApi.getActiveBudgets();
        setBudgets(budgetsData);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description) {
      setFormError('Description is required');
      return;
    }

    const hasIncoming = incomingAmount && !isNaN(parseFloat(incomingAmount)) && parseFloat(incomingAmount) > 0;
    const hasOutgoing = outgoingAmount && !isNaN(parseFloat(outgoingAmount)) && parseFloat(outgoingAmount) > 0;

    if (!hasIncoming && !hasOutgoing) {
      setFormError('Please enter a valid amount in at least one of the fields');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      // Handle incoming amount (negative to increase balance)
      if (hasIncoming) {
        await transactionsApi.createTransaction({
          source_account_id: accountId,
          destination_name: destinationName || undefined,
          description: hasOutgoing ? `${description} (Incoming)` : description,
          amount: -Math.abs(parseFloat(incomingAmount)), // Negative value to increase balance
          category,
          budget_id: budgetId || undefined,
          transaction_date: new Date(transactionDate).toISOString(),
        });
      }

      // Handle outgoing amount (negative)
      if (hasOutgoing) {
        await transactionsApi.createTransaction({
          source_account_id: accountId,
          destination_name: destinationName || undefined,
          description: hasIncoming ? `${description} (Outgoing)` : description,
          amount: -Math.abs(parseFloat(outgoingAmount)), // Ensure negative
          category,
          budget_id: budgetId || undefined,
          transaction_date: new Date(transactionDate).toISOString(),
        });
      }

      // Refresh transactions
      const updatedTransactions = await transactionsApi.getAccountTransactions(accountId);
      setTransactions(updatedTransactions);

      // Refresh account to get updated balance
      const updatedAccount = await accountsApi.getAccount(accountId);
      setAccount(updatedAccount);

      // Reset form
      setDescription('');
      setIncomingAmount('');
      setOutgoingAmount('');
      setDestinationName('');
      setCategory('Uncategorized');
      setBudgetId('');
      setTransactionDate(new Date().toISOString().split('T')[0]);

    } catch (err) {
      setFormError('Failed to create transaction. Please try again.');
      console.error('Error creating transaction:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionsApi.deleteTransaction(id);

        // Refresh transactions
        const updatedTransactions = await transactionsApi.getAccountTransactions(accountId);
        setTransactions(updatedTransactions);

        // Refresh account to get updated balance
        const updatedAccount = await accountsApi.getAccount(accountId);
        setAccount(updatedAccount);
      } catch (err) {
        setError('Failed to delete transaction. Please try again later.');
        console.error('Error deleting transaction:', err);
      }
    }
  };

  // Start editing a field
  const handleStartEdit = (transaction: Transaction, field: EditableField) => {
    // Don't allow editing if another edit is in progress
    if (editSaving) return;

    let initialValue = '';

    // Set the initial value based on the field
    switch (field) {
      case 'description':
        initialValue = transaction.description;
        break;
      case 'category':
        initialValue = transaction.category;
        break;
      case 'budget_id':
        initialValue = transaction.budget_id || '';
        break;
      case 'destination_name':
        // If this account is the destination, we're actually showing the source account name
        // but we don't allow editing it in this case
        if (transaction.destination_account_id === accountId) {
          const sourceName = allAccounts.find(a => a.id === transaction.source_account_id)?.name || '';
          initialValue = sourceName;
        } else {
          initialValue = transaction.destination_name || '';
        }
        break;
      case 'amount':
        initialValue = transaction.amount.toString();
        break;
      case 'transaction_date':
        initialValue = new Date(transaction.transaction_date).toISOString().split('T')[0];
        break;
    }

    setEditing({ transactionId: transaction.id, field });
    setEditValue(initialValue);
    setEditError(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditing(null);
    setEditValue('');
    setEditError(null);
  };

  // Handle key press events during editing
  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Escape') {
      handleCancelEdit();
    } else if (e.key === 'Enter') {
      handleSaveEdit();
    }
  };

  // Save the edited value
  const handleSaveEdit = async () => {
    if (!editing) return;

    const { transactionId, field } = editing;
    const transaction = transactions.find(t => t.id === transactionId);

    if (!transaction) {
      setEditError('Transaction not found');
      return;
    }

    // Validate the edited value
    if (field === 'description' && !editValue.trim()) {
      setEditError('Description is required');
      return;
    }

    if (field === 'amount' && (isNaN(parseFloat(editValue)) || parseFloat(editValue) === 0)) {
      setEditError('Please enter a valid amount');
      return;
    }

    // Don't allow editing destination_name when this account is the destination
    if (field === 'destination_name' && transaction.destination_account_id === accountId) {
      setEditError('Cannot edit source account name');
      return;
    }

    try {
      setEditSaving(true);
      setEditError(null);

      // Prepare the update data
      const updateData: Partial<Transaction> = {};

      switch (field) {
        case 'description':
          updateData.description = editValue.trim();
          break;
        case 'category':
          updateData.category = editValue;
          break;
        case 'budget_id':
          updateData.budget_id = editValue || undefined;
          break;
        case 'destination_name':
          updateData.destination_name = editValue.trim() || undefined;
          break;
        case 'amount':
          updateData.amount = parseFloat(editValue);
          break;
        case 'transaction_date':
          updateData.transaction_date = new Date(editValue).toISOString();
          break;
      }

      // Update the transaction
      await transactionsApi.updateTransaction(transactionId, updateData);

      // Refresh transactions
      const updatedTransactions = await transactionsApi.getAccountTransactions(accountId);
      setTransactions(updatedTransactions);

      // Refresh account to get updated balance
      const updatedAccount = await accountsApi.getAccount(accountId);
      setAccount(updatedAccount);

      // Clear editing state
      setEditing(null);
      setEditValue('');
    } catch (err) {
      setEditError('Failed to update transaction. Please try again.');
      console.error('Error updating transaction:', err);
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return <div>Loading transactions...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!account) {
    return <div>Account not found</div>;
  }

  return (
    <div className="account-ledger">
      <div className="account-header">
        <h2>{account.name}</h2>
        <div className={`account-balance ${account.balance >= 0 ? 'positive' : 'negative'}`}>
          Balance: {account.balance.toFixed(2)}
        </div>
      </div>

      <div className="ledger-container">
        <form className="new-transaction-form" onSubmit={handleSubmit}>
          {formError && <div className="error">{formError}</div>}

          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Budget</th>
                <th>Destination</th>
                <th>Incoming</th>
                <th>Outgoing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New transaction form row */}
              <tr className="new-transaction-row">
                <td>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    required
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    required
                  />
                </td>
                <td>
                  <CategoryInput
                    value={category}
                    onChange={setCategory}
                    placeholder="Select or create a category"
                  />
                </td>
                <td>
                  <select
                    value={budgetId}
                    onChange={(e) => setBudgetId(e.target.value)}
                  >
                    <option value="">No Budget</option>
                    {budgets.map(budget => (
                      <option key={budget.id} value={budget.id}>
                        {budget.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={destinationName}
                    onChange={(e) => setDestinationName(e.target.value)}
                    placeholder="Destination (optional)"
                  />
                </td>
                <td>
                  <label>Incoming</label>
                  <input
                    type="number"
                    value={incomingAmount}
                    onChange={(e) => setIncomingAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </td>
                <td>
                  <label>Outgoing</label>
                  <input
                    type="number"
                    value={outgoingAmount}
                    onChange={(e) => setOutgoingAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </td>
                <td>
                  <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Add'}
                  </button>
                </td>
              </tr>

              {/* Existing transactions */}
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="no-transactions">
                    No transactions found for this account.
                  </td>
                </tr>
              ) : (
                transactions.map(transaction => (
                  <tr key={transaction.id}>
                    {/* Transaction Date */}
                    <td
                      onClick={() => handleStartEdit(transaction, 'transaction_date')}
                      className={editing?.transactionId === transaction.id && editing.field === 'transaction_date' ? 'editing' : ''}
                    >
                      {editing?.transactionId === transaction.id && editing.field === 'transaction_date' ? (
                        <div className="edit-field">
                          <input
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                          />
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} disabled={editSaving}>
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} disabled={editSaving}>Cancel</button>
                          </div>
                          {editError && <div className="edit-error">{editError}</div>}
                        </div>
                      ) : (
                        new Date(transaction.transaction_date).toLocaleDateString()
                      )}
                    </td>

                    {/* Description */}
                    <td
                      onClick={() => handleStartEdit(transaction, 'description')}
                      className={editing?.transactionId === transaction.id && editing.field === 'description' ? 'editing' : ''}
                    >
                      {editing?.transactionId === transaction.id && editing.field === 'description' ? (
                        <div className="edit-field">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                          />
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} disabled={editSaving}>
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} disabled={editSaving}>Cancel</button>
                          </div>
                          {editError && <div className="edit-error">{editError}</div>}
                        </div>
                      ) : (
                        transaction.description
                      )}
                    </td>

                    {/* Category */}
                    <td
                      onClick={() => handleStartEdit(transaction, 'category')}
                      className={editing?.transactionId === transaction.id && editing.field === 'category' ? 'editing' : ''}
                    >
                      {editing?.transactionId === transaction.id && editing.field === 'category' ? (
                        <div className="edit-field">
                          <CategoryInput
                            value={editValue}
                            onChange={setEditValue}
                            placeholder="Select or create a category"
                          />
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} disabled={editSaving}>
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} disabled={editSaving}>Cancel</button>
                          </div>
                          {editError && <div className="edit-error">{editError}</div>}
                        </div>
                      ) : (
                        transaction.category
                      )}
                    </td>

                    {/* Budget */}
                    <td
                      onClick={() => handleStartEdit(transaction, 'budget_id')}
                      className={editing?.transactionId === transaction.id && editing.field === 'budget_id' ? 'editing' : ''}
                    >
                      {editing?.transactionId === transaction.id && editing.field === 'budget_id' ? (
                        <div className="edit-field">
                          <select
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                          >
                            <option value="">No Budget</option>
                            {budgets.map(budget => (
                              <option key={budget.id} value={budget.id}>
                                {budget.name}
                              </option>
                            ))}
                          </select>
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} disabled={editSaving}>
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} disabled={editSaving}>Cancel</button>
                          </div>
                          {editError && <div className="edit-error">{editError}</div>}
                        </div>
                      ) : (
                        transaction.budget_id ?
                          budgets.find(b => b.id === transaction.budget_id)?.name || 'Unknown Budget'
                          : '-'
                      )}
                    </td>

                    {/* Destination */}
                    <td
                      onClick={() => transaction.destination_account_id !== accountId && handleStartEdit(transaction, 'destination_name')}
                      className={`${editing?.transactionId === transaction.id && editing.field === 'destination_name' ? 'editing' : ''} ${transaction.destination_account_id === accountId ? 'non-editable' : ''}`}
                    >
                      {editing?.transactionId === transaction.id && editing.field === 'destination_name' ? (
                        <div className="edit-field">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                            placeholder="Destination (optional)"
                          />
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} disabled={editSaving}>
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} disabled={editSaving}>Cancel</button>
                          </div>
                          {editError && <div className="edit-error">{editError}</div>}
                        </div>
                      ) : (
                        // If this account is the destination, show the source account name
                        // Otherwise, show the destination name
                        transaction.destination_account_id === accountId
                          ? allAccounts.find(a => a.id === transaction.source_account_id)?.name || 'Unknown Source'
                          : transaction.destination_name || '-'
                      )}
                    </td>

                    {/* Amount (Incoming/Outgoing) */}
                    <td
                      className={`amount incoming ${editing?.transactionId === transaction.id && editing.field === 'amount' ? 'editing' : ''}`}
                      onClick={() => transaction.amount <= 0 && handleStartEdit(transaction, 'amount')}
                    >
                      {editing?.transactionId === transaction.id && editing.field === 'amount' && transaction.amount <= 0 ? (
                        <div className="edit-field">
                          <input
                            type="number"
                            value={Math.abs(parseFloat(editValue)).toString()}
                            onChange={(e) => setEditValue((-Math.abs(parseFloat(e.target.value))).toString())}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                            step="0.01"
                            min="0"
                          />
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} disabled={editSaving}>
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} disabled={editSaving}>Cancel</button>
                          </div>
                          {editError && <div className="edit-error">{editError}</div>}
                        </div>
                      ) : (
                        transaction.amount < 0 ? Math.abs(transaction.amount).toFixed(2) : ''
                      )}
                    </td>
                    <td
                      className={`amount outgoing ${editing?.transactionId === transaction.id && editing.field === 'amount' ? 'editing' : ''}`}
                      onClick={() => transaction.amount > 0 && handleStartEdit(transaction, 'amount')}
                    >
                      {editing?.transactionId === transaction.id && editing.field === 'amount' && transaction.amount > 0 ? (
                        <div className="edit-field">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            autoFocus
                            step="0.01"
                            min="0"
                          />
                          <div className="edit-actions">
                            <button onClick={handleSaveEdit} disabled={editSaving}>
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={handleCancelEdit} disabled={editSaving}>Cancel</button>
                          </div>
                          {editError && <div className="edit-error">{editError}</div>}
                        </div>
                      ) : (
                        transaction.amount > 0 ? transaction.amount.toFixed(2) : ''
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="button small danger"
                        disabled={editing?.transactionId === transaction.id}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </form>
      </div>
    </div>
  );
};

export default AccountLedger;
