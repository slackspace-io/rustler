import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { NetWorthData, ChartData, ChartDataPoint } from '../types/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface NetWorthChartProps {
  data: NetWorthData;
}

const NetWorthChart = ({ data }: NetWorthChartProps) => {
  // Generate random color for account lines
  const getRandomColor = () => {
    const r = Math.floor(Math.random() * 200);
    const g = Math.floor(Math.random() * 200);
    const b = Math.floor(Math.random() * 200);
    return `rgba(${r}, ${g}, ${b}, 1)`;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
    const datasets = [];

    // Add net worth line
    const netWorthPoints: ChartDataPoint[] = data.net_worth.map(balance => ({
      x: formatDate(balance.date),
      y: balance.amount,
    }));

    datasets.push({
      label: 'Net Worth',
      data: netWorthPoints,
      borderColor: 'rgba(53, 162, 235, 1)',
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
      fill: false,
      borderWidth: 3,
    });

    // Add individual account lines
    data.accounts.forEach(accountWithBalances => {
      const { account, balances } = accountWithBalances;
      const color = getRandomColor();

      const accountPoints: ChartDataPoint[] = balances.map(balance => ({
        x: formatDate(balance.date),
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
      });
    });

    return { datasets };
  }, [data]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
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
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default NetWorthChart;
