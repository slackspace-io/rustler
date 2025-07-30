import { useState, useEffect } from 'react';
import { Container, Title, Text, Group, Stack, Button, LoadingOverlay } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import AccountSelector from './components/AccountSelector';
import NetWorthChart from './components/NetWorthChart';
import { fetchAccounts, fetchNetWorth } from './api/api';
import { Account, NetWorthData } from './types/types';

function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [netWorthData, setNetWorthData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(new Date().setMonth(new Date().getMonth() - 6)), // 6 months ago
    new Date(),
  ]);

  // Fetch accounts on component mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoading(true);
        const accountsData = await fetchAccounts();
        setAccounts(accountsData);
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, []);

  // Fetch net worth data when selected accounts or date range changes
  const handleFetchNetWorth = async () => {
    if (selectedAccounts.length === 0) {
      return;
    }

    try {
      setLoading(true);
      const data = await fetchNetWorth(
        selectedAccounts,
        dateRange[0] ? dateRange[0] : undefined,
        dateRange[1] ? dateRange[1] : undefined
      );
      setNetWorthData(data);
    } catch (error) {
      console.error('Failed to fetch net worth data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack spacing="xl">
        <Title order={1}>Firefly III Account Tracker</Title>
        <Text>Track your net worth over time using your Firefly III accounts.</Text>

        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={loading} overlayBlur={2} />

          <Stack spacing="md">
            <Title order={2}>Select Accounts</Title>
            <AccountSelector
              accounts={accounts}
              selectedAccounts={selectedAccounts}
              onChange={setSelectedAccounts}
            />

            <Group align="end">
              <DatePickerInput
                type="range"
                label="Date Range"
                placeholder="Select date range"
                value={dateRange}
                onChange={setDateRange}
                clearable
                style={{ flex: 1 }}
              />
              <Button onClick={handleFetchNetWorth} disabled={selectedAccounts.length === 0}>
                Calculate Net Worth
              </Button>
            </Group>

            {netWorthData && (
              <div>
                <Title order={2} mt="xl">Net Worth Over Time</Title>
                <NetWorthChart data={netWorthData} />
              </div>
            )}
          </Stack>
        </div>
      </Stack>
    </Container>
  );
}

export default App;
