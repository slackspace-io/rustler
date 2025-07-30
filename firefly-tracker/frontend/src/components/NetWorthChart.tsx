import { useMemo } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns'; // Import date adapter for TimeScale
import { Line } from 'react-chartjs-2';
import { NetWorthData, ChartData, ChartDataPoint } from '../types/types';

// Register Chart.js components
ChartJS.register(
  TimeScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface NetWorthChartProps {
  data: NetWorthData;
}

const NetWorthChart = ({ data }: NetWorthChartProps) => {
  console.log('NetWorthChart rendering with data:', data);

  // Generate random color for account lines
  const getRandomColor = () => {
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgba(${r}, ${g}, ${b}, 1)`;
  };

  // Parse date string to Date object
  const parseDate = (dateString: string) => {
    console.log('Parsing date:', dateString);
    try {
      return new Date(dateString);
    } catch (error) {
      console.error('Error parsing date:', error);
      return new Date(); // Return current date as fallback
    }
  };

  // Format currency for tooltips
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD', // Default to USD, could be improved to use account currency
    }).format(value);
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    console.log('Preparing chart data from:', data);
    const datasets = [];

    try {
      // Add net worth line
      if (data.net_worth && data.net_worth.length > 0) {
        console.log('Net worth data points:', data.net_worth.length);
        const netWorthPoints: ChartDataPoint[] = data.net_worth.map(balance => {
          try {
            return {
              x: parseDate(balance.date),
              y: balance.amount,
            };
          } catch (error) {
            console.error('Error mapping net worth point:', error, balance);
            return { x: new Date(), y: 0 };
          }
        });

        datasets.push({
          label: 'Net Worth',
          data: netWorthPoints,
          borderColor: 'rgba(53, 162, 235, 1)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          fill: false,
          borderWidth: 3,
          tension: 0.1, // Add slight curve to line
        });
      } else {
        console.warn('No net worth data available or empty array');
      }

      // Add individual account lines
      if (data.accounts && data.accounts.length > 0) {
        console.log('Account data points:', data.accounts.length);
        data.accounts.forEach(accountWithBalances => {
          try {
            const { account, balances } = accountWithBalances;
            const color = getRandomColor();

            if (balances && balances.length > 0) {
              const accountPoints: ChartDataPoint[] = balances.map(balance => ({
                x: parseDate(balance.date),
                y: balance.amount,
              }));

              datasets.push({
                label: account.name,
                data: accountPoints,
                borderColor: color,
                backgroundColor: color.replace('1)', '0.2)'),
                fill: false,
                borderWidth: 1.5,
                borderDash: [],
                tension: 0.1, // Add slight curve to line
              });
            } else {
              console.warn(`No balance data for account: ${account.name}`);
            }
          } catch (error) {
            console.error('Error processing account:', error, accountWithBalances);
          }
        });
      } else {
        console.warn('No account data available or empty array');
      }
    } catch (error) {
      console.error('Error preparing chart data:', error);
    }

    console.log('Final datasets:', datasets);
    return { datasets };
  }, [data]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          tooltipFormat: 'PPP', // Format like "Apr 30, 2023"
          displayFormats: {
            day: 'MMM d',
          },
        },
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Amount',
        },
        ticks: {
          callback: (value: number) => formatCurrency(value),
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = formatCurrency(context.parsed.y);
            return `${label}: ${value}`;
          },
          title: (tooltipItems: any[]) => {
            // Format the date in the tooltip
            if (tooltipItems.length > 0) {
              const date = new Date(tooltipItems[0].parsed.x);
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            }
            return '';
          },
        },
      },
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Net Worth Over Time',
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  // Check if we have valid data to display
  const hasData = chartData.datasets && chartData.datasets.length > 0 &&
                 chartData.datasets.some(dataset => dataset.data && dataset.data.length > 0);

  console.log('Chart has valid data to display:', hasData);

  return (
    <div className="chart-container" style={{ width: '100%', height: '100%' }}>
      {hasData ? (
        <Line data={chartData} options={options} />
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          color: '#666',
          textAlign: 'center',
          padding: '20px'
        }}>
          No data available to display. Try selecting different accounts or date range.
        </div>
      )}
    </div>
  );
};

export default NetWorthChart;
