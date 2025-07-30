import { useState } from 'react';
import { SimpleGrid, Card, Text, Badge, Group, Checkbox } from '@mantine/core';
import { Account } from '../types/types';

interface AccountSelectorProps {
  accounts: Account[];
  selectedAccounts: string[];
  onChange: (selectedIds: string[]) => void;
}

const AccountSelector = ({ accounts, selectedAccounts, onChange }: AccountSelectorProps) => {
  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    const newSelection = selectedAccounts.includes(accountId)
      ? selectedAccounts.filter(id => id !== accountId)
      : [...selectedAccounts, accountId];

    onChange(newSelection);
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
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
      {accounts.map(account => (
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
  );
};

export default AccountSelector;
