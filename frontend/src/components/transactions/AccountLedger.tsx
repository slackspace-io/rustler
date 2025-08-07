import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { transactionsApi, accountsApi, budgetsApi, categoriesApi } from '../../services/api';
import type { Transaction, Account, Budget, Category } from '../../services/api';
import CategoryInput from '../common/CategoryInput';
import { useSettings } from '../../contexts/useSettings';

interface AccountLedgerProps {
  accountId: string;
  refreshKey?: number;
}

// Define the editable fields and their types
type EditableField = 'description' | 'category' | 'budget_id' | 'destination_name' | 'amount' | 'transaction_date';

// Interface for tracking which field is being edited
interface EditingState {
  transactionId: string;
  field: EditableField;
}

const AccountLedger = ({ accountId, refreshKey = 0 }: AccountLedgerProps) => {
  const { formatNumber } = useSettings();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [account, setAccount] = useState<Account | null>(null);
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for storing running balances for each transaction
  const [runningBalances, setRunningBalances] = useState<Record<string, number>>({});

  // State for multi-selection
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkBudgetId, setBulkBudgetId] = useState('');

  // Ref for the description input field
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  // State for tracking which field is being edited
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Form state for new transaction
  const [description, setDescription] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [category, setCategory] = useState('Uncategorized');
  const [destinationName, setDestinationName] = useState('');
  const [budgetId, setBudgetId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Categories are now managed through the CategoryInput component

  // Calculate running balances for transactions
  const calculateRunningBalances = (transactions: Transaction[], accountId: string, currentBalance: number) => {
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) =>
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );

    const balances: Record<string, number> = {};
    let runningBalance = currentBalance;

    // Calculate running balance for each transaction
    for (const transaction of sortedTransactions) {
      balances[transaction.id] = runningBalance;

      // Adjust running balance based on transaction type
      if (transaction.source_account_id === accountId) {
        // This account is the source
        runningBalance += transaction.amount; // Add back the amount (positive for withdrawal, negative for deposit)
      } else if (transaction.destination_account_id === accountId) {
        // This account is the destination
        runningBalance += transaction.amount; // Add back the negative amount
      }
    }

    return balances;
  };

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

        // Calculate running balances
        if (accountData) {
          const balances = calculateRunningBalances(transactionsData, accountId, accountData.balance);
          setRunningBalances(balances);
        }

        // Fetch budgets
        const budgetsData = await budgetsApi.getActiveBudgets();
        setBudgets(budgetsData);

        // Fetch categories
        const categoriesData = await categoriesApi.getCategories();
        setCategories(categoriesData);

        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [accountId, refreshKey]);

  // Filter transactions based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTransactions(transactions);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const filtered = transactions.filter(transaction => {
      // Search in all relevant fields
      return (
        // Description
        transaction.description.toLowerCase().includes(query) ||
        // Category
        transaction.category.toLowerCase().includes(query) ||
        // Date
        new Date(transaction.transaction_date).toLocaleDateString().toLowerCase().includes(query) ||
        // Amount (as string)
        Math.abs(transaction.amount).toString().includes(query) ||
        // Destination name
        (transaction.destination_name && transaction.destination_name.toLowerCase().includes(query)) ||
        // Budget name (need to look up from budgets array)
        (transaction.budget_id &&
          budgets.find(b => b.id === transaction.budget_id)?.name.toLowerCase().includes(query))
      );
    });

    setFilteredTransactions(filtered);

    // If we're filtering and have selected transactions, we need to ensure
    // that we only keep the selected transactions that are still visible
    if (selectedTransactions.length > 0) {
      const visibleSelectedIds = filtered.map(t => t.id).filter(id => selectedTransactions.includes(id));
      setSelectedTransactions(visibleSelectedIds);
    }
  }, [searchQuery, transactions, budgets, selectedTransactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description) {
      setFormError('Description is required');
      return;
    }

    const hasDeposit = depositAmount && !isNaN(parseFloat(depositAmount)) && parseFloat(depositAmount) > 0;
    const hasWithdrawal = withdrawalAmount && !isNaN(parseFloat(withdrawalAmount)) && parseFloat(withdrawalAmount) > 0;

    if (!hasDeposit && !hasWithdrawal) {
      setFormError('Please enter a valid amount in at least one of the fields');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      // Check if the category exists, create it if it doesn't
      if (category && category.trim() !== '') {
        const categoryExists = categories.some(
          cat => cat.name.toLowerCase() === category.toLowerCase()
        );

        if (!categoryExists) {
          try {
            // Create the new category
            const newCategory = await categoriesApi.createCategory({ name: category });
            console.log('Created new category:', newCategory);

            // Update the categories list
            setCategories(prevCategories => [...prevCategories, newCategory]);
          } catch (err) {
            console.error('Error creating category:', err);
            // Continue with transaction creation even if category creation fails
          }
        }
      }

      // Handle withdrawal amount (positive to decrease balance)
      if (hasWithdrawal) {
        await transactionsApi.createTransaction({
          source_account_id: accountId,
          destination_name: destinationName || undefined,
          description: hasWithdrawal ? `${description} (Withdrawal)` : description,
          amount: Math.abs(parseFloat(withdrawalAmount)), // Positive value to decrease balance
          category,
          budget_id: budgetId || undefined,
          transaction_date: new Date(transactionDate).toISOString(),
        });
      }

      // Handle deposit amount (negative to increase balance)
      if (hasDeposit) {
        await transactionsApi.createTransaction({
          source_account_id: accountId,
          destination_name: destinationName || undefined,
          description: hasDeposit ? `${description} (Deposit)` : description,
          amount: -Math.abs(parseFloat(depositAmount)), // Negative value to increase balance
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

      // Recalculate running balances
      const balances = calculateRunningBalances(updatedTransactions, accountId, updatedAccount.balance);
      setRunningBalances(balances);

      // Reset form
      setDescription('');
      setDepositAmount('');
      setWithdrawalAmount('');
      setDestinationName('');
      setCategory('Uncategorized');
      setBudgetId('');
      setTransactionDate(new Date().toISOString().split('T')[0]);

      // Focus on the description field to make adding another transaction easier
      setTimeout(() => {
        if (descriptionInputRef.current) {
          descriptionInputRef.current.focus();
        }
      }, 0);

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

        // Recalculate running balances
        const balances = calculateRunningBalances(updatedTransactions, accountId, updatedAccount.balance);
        setRunningBalances(balances);
      } catch (err) {
        setError('Failed to delete transaction. Please try again later.');
        console.error('Error deleting transaction:', err);
      }
    }
  };

  // Helper function to adjust transaction description based on account perspective
  const getAdjustedDescription = (transaction: Transaction): string => {
    // If this account is the destination, and the description contains "Withdrawal",
    // replace it with "Deposit" to reflect the correct perspective
    if (transaction.destination_account_id === accountId &&
        transaction.description.includes('(Withdrawal)')) {
      return transaction.description.replace('(Withdrawal)', '(Deposit)');
    }

    // If this account is the source, and the description contains "Deposit",
    // replace it with "Withdrawal" to reflect the correct perspective
    if (transaction.source_account_id === accountId &&
        transaction.description.includes('(Deposit)')) {
      return transaction.description.replace('(Deposit)', '(Withdrawal)');
    }

    // Otherwise, return the original description
    return transaction.description;
  };

  // Start editing a field
  const handleStartEdit = (transaction: Transaction, field: EditableField) => {
    // Don't allow editing if another edit is in progress
    if (editSaving) return;

    let initialValue = '';

    // Set the initial value based on the field
    switch (field) {
      case 'description':
        // Use the adjusted description when editing to maintain consistency
        initialValue = getAdjustedDescription(transaction);
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

  // Handle selecting/deselecting a single transaction
  const handleSelectTransaction = (transactionId: string) => {
    setSelectedTransactions(prev => {
      if (prev.includes(transactionId)) {
        return prev.filter(id => id !== transactionId);
      } else {
        return [...prev, transactionId];
      }
    });
  };

  // Handle selecting/deselecting all transactions
  const handleSelectAllTransactions = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      // If all are selected, deselect all
      setSelectedTransactions([]);
    } else {
      // Otherwise, select all
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    }
  };

  // Handle opening the bulk edit modal
  const handleOpenBulkEditModal = () => {
    if (selectedTransactions.length > 0) {
      // Reset bulk edit form values
      setBulkCategory('');
      setBulkBudgetId('');
      setShowBulkEditModal(true);
    }
  };

  // Handle closing the bulk edit modal
  const handleCloseBulkEditModal = () => {
    setShowBulkEditModal(false);
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

      // If editing a category, check if it exists and create it if needed
      if (field === 'category' && editValue && editValue.trim() !== '') {
        const categoryExists = categories.some(
          cat => cat.name.toLowerCase() === editValue.toLowerCase()
        );

        if (!categoryExists) {
          try {
            // Create the new category
            const newCategory = await categoriesApi.createCategory({ name: editValue });
            console.log('Created new category during edit:', newCategory);

            // Update the categories list
            setCategories(prevCategories => [...prevCategories, newCategory]);
          } catch (err) {
            console.error('Error creating category during edit:', err);
            // Continue with transaction update even if category creation fails
          }
        }
      }

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

      // Recalculate running balances
      const balances = calculateRunningBalances(updatedTransactions, accountId, updatedAccount.balance);
      setRunningBalances(balances);

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

  // Handle bulk update of transactions
  const handleBulkUpdate = async (bulkCategory: string, bulkBudgetId: string) => {
    if (selectedTransactions.length === 0) return;

    try {
      // Create a new category if it doesn't exist
      if (bulkCategory && bulkCategory.trim() !== '') {
        const categoryExists = categories.some(
          cat => cat.name.toLowerCase() === bulkCategory.toLowerCase()
        );

        if (!categoryExists) {
          try {
            // Create the new category
            const newCategory = await categoriesApi.createCategory({ name: bulkCategory });
            console.log('Created new category during bulk edit:', newCategory);

            // Update the categories list
            setCategories(prevCategories => [...prevCategories, newCategory]);
          } catch (err) {
            console.error('Error creating category during bulk edit:', err);
            // Continue with transaction update even if category creation fails
          }
        }
      }

      // Update each selected transaction
      const updatePromises = selectedTransactions.map(transactionId => {
        const updateData: Partial<Transaction> = {};

        if (bulkCategory) {
          updateData.category = bulkCategory;
        }

        if (bulkBudgetId) {
          updateData.budget_id = bulkBudgetId === 'none' ? undefined : bulkBudgetId;
        }

        return transactionsApi.updateTransaction(transactionId, updateData);
      });

      await Promise.all(updatePromises);

      // Refresh transactions
      const updatedTransactions = await transactionsApi.getAccountTransactions(accountId);
      setTransactions(updatedTransactions);

      // Refresh account to get updated balance
      const updatedAccount = await accountsApi.getAccount(accountId);
      setAccount(updatedAccount);

      // Recalculate running balances
      const balances = calculateRunningBalances(updatedTransactions, accountId, updatedAccount.balance);
      setRunningBalances(balances);

      // Clear selection and close modal
      setSelectedTransactions([]);
      setShowBulkEditModal(false);
    } catch (err) {
      console.error('Error updating transactions in bulk:', err);
      alert('Failed to update transactions. Please try again.');
    }
  };

  return (
    <div className="account-ledger">
      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Bulk Edit Transactions</h3>
              <button className="close-button" onClick={handleCloseBulkEditModal}>×</button>
            </div>
            <div className="modal-body">
              <p>Editing {selectedTransactions.length} transaction(s)</p>

              <div className="form-group">
                <label>Category</label>
                <CategoryInput
                  value={bulkCategory}
                  onChange={setBulkCategory}
                  placeholder="Select or create a category"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bulk-budget">Budget</label>
                <select
                  id="bulk-budget"
                  value={bulkBudgetId}
                  onChange={(e) => setBulkBudgetId(e.target.value)}
                >
                  <option value="">No Change</option>
                  <option value="none">No Budget</option>
                  {budgets.map(budget => (
                    <option key={budget.id} value={budget.id}>
                      {budget.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleCloseBulkEditModal}>Cancel</button>
              <button
                onClick={() => handleBulkUpdate(bulkCategory, bulkBudgetId)}
                className="primary"
              >
                Update Transactions
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="account-header">
        <h2>{account.name}</h2>
        <div className={`account-balance ${account.balance >= 0 ? 'positive' : 'negative'}`}>
          Balance: {formatNumber(account.balance)}
        </div>
      </div>

      {/* New Transaction Form */}
      <form className="new-transaction-form" onSubmit={handleSubmit}>
        {formError && <div className="error">{formError}</div>}

        <div className="form-group">
          <label htmlFor="transaction-date">Date</label>
          <input
            id="transaction-date"
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="transaction-description">Description</label>
          <input
            id="transaction-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            required
            ref={descriptionInputRef}
          />
        </div>

        <div className="form-group">
          <label>Category</label>
          <CategoryInput
            value={category}
            onChange={setCategory}
            placeholder="Select or create a category"
          />
        </div>

        <div className="form-group">
          <label htmlFor="transaction-budget">Budget</label>
          <select
            id="transaction-budget"
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
        </div>

        <div className="form-group">
          <label htmlFor="transaction-destination">Destination</label>
          <input
            id="transaction-destination"
            type="text"
            value={destinationName}
            onChange={(e) => setDestinationName(e.target.value)}
            placeholder="Destination (optional)"
          />
        </div>

        <div className="form-group">
          <label htmlFor="transaction-withdrawal">Withdrawal</label>
          <input
            id="transaction-withdrawal"
            type="number"
            value={withdrawalAmount}
            onChange={(e) => setWithdrawalAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="transaction-deposit">Deposit</label>
          <input
            id="transaction-deposit"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Add Transaction'}
          </button>
        </div>
      </form>

      {/* Transactions Table */}
      <div className="ledger-container">
        {/* Search and Bulk actions */}
        <div className="ledger-actions">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              aria-label="Search transactions"
            />
          </div>
          <div className="bulk-actions">
            <button
              onClick={handleOpenBulkEditModal}
              disabled={selectedTransactions.length === 0}
              className="button"
            >
              Bulk Edit ({selectedTransactions.length} selected)
            </button>
          </div>
        </div>
        <div className="ledger-table-wrapper">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={filteredTransactions.length > 0 && selectedTransactions.length === filteredTransactions.length}
                    onChange={handleSelectAllTransactions}
                    aria-label="Select all transactions"
                  />
                </th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Budget</th>
                <th>Destination</th>
                <th>Withdrawal</th>
                <th>Deposit</th>
                <th>Running Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Existing transactions */}
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="no-transactions">
                    {transactions.length === 0 ?
                      "No transactions found for this account." :
                      "No transactions match your search criteria."}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(transaction => (
                  <tr key={transaction.id}>
                    {/* Checkbox for selecting transaction */}
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        aria-label={`Select transaction ${transaction.description}`}
                      />
                    </td>
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
                        getAdjustedDescription(transaction)
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
                        // Otherwise, show the destination name or look it up from accounts list
                        transaction.destination_account_id === accountId
                          ? allAccounts.find(a => a.id === transaction.source_account_id)?.name || 'Unknown Source'
                          : transaction.destination_name ||
                            (transaction.destination_account_id
                              ? allAccounts.find(a => a.id === transaction.destination_account_id)?.name || 'Unknown Destination'
                              : '-')
                      )}
                    </td>

                    {/* Amount (Withdrawal/Deposit) */}
                    <td
                      className={`amount withdrawal ${editing?.transactionId === transaction.id && editing.field === 'amount' ? 'editing' : ''}`}
                      onClick={() => {
                        // Allow editing if this is a withdrawal from the current account's perspective
                        const isWithdrawal = transaction.source_account_id === accountId && transaction.amount > 0;
                        if (isWithdrawal) handleStartEdit(transaction, 'amount');
                      }}
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
                        // Show as withdrawal only if this account is the source and amount is positive
                        transaction.source_account_id === accountId && transaction.amount > 0
                          ? transaction.amount.toFixed(2)
                          : ''
                      )}
                    </td>
                    <td
                      className={`amount deposit ${editing?.transactionId === transaction.id && editing.field === 'amount' ? 'editing' : ''}`}
                      onClick={() => {
                        // Allow editing if this is a deposit from the current account's perspective
                        const isDeposit =
                          (transaction.source_account_id === accountId && transaction.amount <= 0) || // Negative amount in source account
                          (transaction.destination_account_id === accountId); // Any amount in destination account
                        if (isDeposit) handleStartEdit(transaction, 'amount');
                      }}
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
                        // Show as deposit if:
                        // 1. This account is the source and amount is negative (a deposit into this account)
                        // 2. This account is the destination (receiving money from another account)
                        (transaction.source_account_id === accountId && transaction.amount < 0) ||
                        (transaction.destination_account_id === accountId)
                          ? Math.abs(transaction.amount).toFixed(2)
                          : ''
                      )}
                    </td>

                    {/* Running Balance */}
                    <td className="amount">
                      {runningBalances[transaction.id] !== undefined ? formatNumber(runningBalances[transaction.id]) : ''}
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
        </div>
      </div>
    </div>
  );
};

export default AccountLedger;
