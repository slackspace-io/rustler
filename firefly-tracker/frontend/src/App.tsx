import { useState, useEffect } from 'react';
import { Container, Title, Text, Group, Stack, Button, LoadingOverlay, SegmentedControl } from '@mantine/core';
import AccountSelector from './components/AccountSelector';
import NetWorthChart from './components/NetWorthChart';
import { fetchAccounts, fetchNetWorth } from './api/api';
import { Account, NetWorthData } from './types/types';

function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [netWorthData, setNetWorthData] = useState<NetWorthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("6");
  const [selectedFrequency, setSelectedFrequency] = useState<string>("auto");

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

  // Convert selected period to date range and fetch net worth data
  const handleFetchNetWorth = async () => {
    if (selectedAccounts.length === 0) {
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching net worth data for accounts:', selectedAccounts);
      console.log('Selected period:', selectedPeriod);

      // Calculate start date based on selected period (in months)
      const endDate = new Date(); // Current date
      const startDate = new Date();

      // Parse the selected period, default to 6 months if invalid
      const months = parseInt(selectedPeriod);
      const periodMonths = isNaN(months) ? 6 : months;

      startDate.setMonth(startDate.getMonth() - periodMonths);

      console.log('Calculated date range:', { startDate, endDate, periodMonths });

      console.log('Selected frequency:', selectedFrequency);

      const data = await fetchNetWorth(
        selectedAccounts,
        startDate,
        endDate,
        selectedFrequency
      );

      console.log('Received net worth data:', data);

      if (!data || !data.net_worth || data.net_worth.length === 0) {
        console.warn('No net worth data received or empty net worth array');
      }

      setNetWorthData(data);
      console.log('Net worth data set to state:', data);
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
              <div style={{ flex: 1 }}>
                <Text size="sm" weight={500} mb="xs">Select Time Period:</Text>
                <SegmentedControl
                  value={selectedPeriod}
                  onChange={setSelectedPeriod}
                  data={[
                    { label: 'Last 1 month', value: '1' },
                    { label: 'Last 3 months', value: '3' },
                    { label: 'Last 6 months', value: '6' },
                    { label: 'Last 12 months', value: '12' },
                  ]}
                  fullWidth
                />
              </div>
              <Button onClick={handleFetchNetWorth} disabled={selectedAccounts.length === 0}>
                Calculate Net Worth
              </Button>
            </Group>

            <Group align="center">
              <div style={{ flex: 1 }}>
                <Text size="sm" weight={500} mb="xs">Data Point Frequency:</Text>
                <SegmentedControl
                  value={selectedFrequency}
                  onChange={setSelectedFrequency}
                  data={[
                    { label: 'Auto', value: 'auto' },
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                  ]}
                  fullWidth
                />
              </div>
            </Group>

            {/* Always show the section title */}
            <Title order={2} mt="xl">Net Worth Over Time</Title>

            {/* Show a message if no data or if no accounts selected */}
            {!netWorthData && (
              <Text color="dimmed" mt="md">
                {selectedAccounts.length === 0
                  ? "Select accounts and click 'Calculate Net Worth' to see your net worth over time."
                  : "Click 'Calculate Net Worth' to generate the chart."}
              </Text>
            )}

            {/* Show the chart if data is available */}
            {netWorthData && (
              <div style={{ height: '400px', marginTop: '20px' }}>
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
