import { useState, useMemo } from 'react';
import { SimpleGrid, Card, Text, Badge, Group, Checkbox, SegmentedControl, Box } from '@mantine/core';
import { Account } from '../types/types';

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccounts: string[];
  onChange: (selectedIds: string[]) => void;
}

const AccountSelector = ({ accounts, selectedAccounts, onChange }: AccountSelectorProps) => {
  // State for account type filter
  const [selectedType, setSelectedType] = useState<string>('all');

  // Get unique account types from accounts
  const accountTypes = useMemo(() => {
    const types = accounts.map(account => account.type_name.toLowerCase());
    return ['all', ...Array.from(new Set(types))];
  }, [accounts]);

  // Filter accounts by selected type
  const filteredAccounts = useMemo(() => {
    if (selectedType === 'all') {
      return accounts;
    }
    return accounts.filter(account => account.type_name.toLowerCase() === selectedType);
  }, [accounts, selectedType]);

  // Check if all filtered accounts are selected
  const areAllFilteredAccountsSelected = useMemo(() => {
    if (filteredAccounts.length === 0) return false;
    return filteredAccounts.every(account => selectedAccounts.includes(account.id));
  }, [filteredAccounts, selectedAccounts]);

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter(id => id !== accountId)
      : [...selectedAccounts, accountId];

    onChange(newSelection);
  };

  // Toggle all filtered accounts
  const toggleAllFilteredAccounts = () => {
    if (areAllFilteredAccountsSelected) {
      // Deselect all filtered accounts
      const newSelection = selectedAccounts.filter(
        id => !filteredAccounts.some(account => account.id === id)
      );
      onChange(newSelection);
    } else {
      // Select all filtered accounts
      const filteredIds = filteredAccounts.map(account => account.id);
      const newSelection = [
        ...selectedAccounts.filter(id => !filteredIds.includes(id)),
        ...filteredIds
      ];
      onChange(newSelection);
    }
  };

  // Check if an account is selected
  const isSelected = (accountId: string) => selectedAccounts.includes(accountId);

  // Get account type badge color
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'asset':
        return 'blue';
      case 'expense':
        return 'red';
      case 'revenue':
        return 'green';
      case 'liability':
        return 'orange';
      case 'loan':
        return 'violet';
      case 'debt':
        return 'pink';
      case 'mortgage':
        return 'grape';
      case 'investment':
        return 'teal';
      case 'cash':
        return 'lime';
      case 'credit card':
        return 'cyan';
      case 'savings':
        return 'indigo';
      case 'checking':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  // Format currency amount
  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  };

  return (
    <>
      <Box mb="md">
        <Text weight={500} mb="xs">Filter by account type:</Text>
        <SegmentedControl
          value={selectedType}
          onChange={setSelectedType}
          data={accountTypes.map(type => ({
            label: type.charAt(0).toUpperCase() + type.slice(1),
            value: type
          }))}
        />
      </Box>

      <Group position="apart" mb="md">
        <Text size="sm">
          Showing {filteredAccounts.length} {selectedType === 'all' ? 'accounts' : selectedType + ' accounts'}
        </Text>
        <Checkbox
          label="Select All"
          checked={areAllFilteredAccountsSelected && filteredAccounts.length > 0}
          onChange={toggleAllFilteredAccounts}
          disabled={filteredAccounts.length === 0}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {filteredAccounts.map(account => (
          <Card
            key={account.id}
            padding="md"
            radius="md"
            withBorder
            className={`account-card ${isSelected(account.id) ? 'selected' : ''}`}
            onClick={() => toggleAccount(account.id)}
          >
            <Group position="apart" mb="xs">
              <Text weight={500}>{account.name}</Text>
              <Badge color={getTypeColor(account.type_name)}>
                {account.type_name}
              </Badge>
            </Group>

            <Text size="xl" weight={700} color={account.current_balance >= 0 ? 'green' : 'red'}>
              {formatCurrency(account.current_balance, account.currency_code)}
            </Text>

            <Group position="right" mt="md">
              <Checkbox
                checked={isSelected(account.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleAccount(account.id);
                }}
                label="Include in net worth"
              />
            </Group>
          </Card>
        ))}
      </SimpleGrid>
    </>
  );
};

export default AccountSelector;
