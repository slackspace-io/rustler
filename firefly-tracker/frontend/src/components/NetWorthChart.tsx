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

  // Generate colors from a modern palette for account lines
  const getAccountColor = (index: number) => {
    // Modern color palette
    const colors = [
      'rgba(75, 192, 192, 1)',    // Teal
      'rgba(255, 159, 64, 1)',    // Orange
      'rgba(153, 102, 255, 1)',   // Purple
      'rgba(255, 99, 132, 1)',    // Pink
      'rgba(54, 162, 235, 1)',    // Blue
      'rgba(255, 206, 86, 1)',    // Yellow
      'rgba(46, 204, 113, 1)',    // Green
      'rgba(231, 76, 60, 1)',     // Red
      'rgba(52, 152, 219, 1)',    // Light Blue
      'rgba(155, 89, 182, 1)',    // Violet
    ];

    return colors[index % colors.length];
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
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(53, 162, 235, 0.6)');
            gradient.addColorStop(1, 'rgba(53, 162, 235, 0.05)');
            return gradient;
          },
          fill: true,
          borderWidth: 3,
          tension: 0.4, // Increased for smoother curves
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: 'white',
          pointBorderColor: 'rgba(53, 162, 235, 1)',
          pointBorderWidth: 2
        });
      } else {
        console.warn('No net worth data available or empty array');
      }

      // Add individual account lines
      if (data.accounts && data.accounts.length > 0) {
        console.log('Account data points:', data.accounts.length);
        data.accounts.forEach((accountWithBalances, index) => {
          try {
            const { account, balances } = accountWithBalances;
            const color = getAccountColor(index);

            if (balances && balances.length > 0) {
              const accountPoints: ChartDataPoint[] = balances.map(balance => ({
                x: parseDate(balance.date),
                y: balance.amount,
              }));

              datasets.push({
                label: account.name,
                data: accountPoints,
                borderColor: color,
                backgroundColor: color.replace('1)', '0.15)'),
                fill: false,
                borderWidth: 2,
                borderDash: [],
                tension: 0.3, // Smoother curve for account lines
                pointRadius: 2,
                pointHoverRadius: 5,
                pointBackgroundColor: 'white',
                pointBorderColor: color,
                pointBorderWidth: 1.5,
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
    animation: {
      duration: 1500, // Animation duration in milliseconds
      easing: 'easeOutQuart', // Smooth easing function
    },
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
          font: {
            size: 14,
            weight: '500',
          },
          color: '#666',
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 12,
          },
          color: '#888',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Amount',
          font: {
            size: 14,
            weight: '500',
          },
          color: '#666',
        },
        ticks: {
          callback: (value: number) => formatCurrency(value),
          font: {
            size: 12,
          },
          color: '#888',
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        beginAtZero: false,
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#333',
        bodyColor: '#666',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
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
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 13,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: true,
        text: 'Net Worth Over Time',
        font: {
          size: 18,
          weight: '600',
        },
        color: '#333',
        padding: {
          top: 10,
          bottom: 20,
        },
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
    <div className="chart-container" style={{
      width: '100%',
      height: '100%',
      padding: '20px',
      borderRadius: '12px',
      backgroundColor: 'white',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden'
    }}>
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
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '15px'
        }}>
          No data available to display. Try selecting different accounts or date range.
        </div>
      )}
    </div>
  );
};

export default NetWorthChart;
