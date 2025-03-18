import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DailyBarChartProps {
  dailyStats: Record<string, number>;
}

const DailyBarChart: React.FC<DailyBarChartProps> = ({ dailyStats }) => {
  // Преобразуем данные в формат для Chart.js
  const dates = Object.keys(dailyStats).sort();
  
  // Проверяем, есть ли данные для отображения
  if (dates.length === 0) {
    return <div className="chart-message">Нет данных для отображения</div>;
  }
  
  // Форматируем даты для отображения
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit',
      month: '2-digit'
    });
  };
  
  // Преобразуем секунды в часы для лучшей читаемости
  const secondsToHours = (seconds: number): number => {
    return Math.round(seconds / 36) / 100; // Округляем до сотых долей часа
  };
  
  const chartData = {
    labels: dates.map(formatDate),
    datasets: [
      {
        label: 'Рабочие часы',
        data: dates.map(date => secondsToHours(dailyStats[date])),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Ежедневная продолжительность работы (часы)',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const hours = context.raw as number;
            const minutes = Math.round((hours % 1) * 60);
            return `${Math.floor(hours)} ч ${minutes} мин`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Часы'
        },
        ticks: {
          callback: function(value: any) {
            return `${value} ч`;
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Дата'
        }
      }
    }
  };
  
  return (
    <div className="chart-container" style={{ height: '400px', marginBottom: '2rem' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default DailyBarChart; 