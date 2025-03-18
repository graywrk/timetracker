import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface WeeklyTrendsChartProps {
  dailyStats: Record<string, number>;
}

// Названия дней недели в русской локализации
const DAYS_OF_WEEK = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота'
];

const WeeklyTrendsChart: React.FC<WeeklyTrendsChartProps> = ({ dailyStats }) => {
  // Преобразуем данные для отображения по дням недели
  const weeklyData = useMemo(() => {
    // Создаем массив для хранения суммы времени по дням недели
    const dayTotals = Array(7).fill(0);
    // Создаем массив для хранения количества дней каждого типа
    const dayCounts = Array(7).fill(0);
    
    // Обрабатываем каждую дату
    Object.entries(dailyStats).forEach(([dateStr, seconds]) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay(); // 0 - воскресенье, 6 - суббота
      
      // Добавляем время к соответствующему дню недели
      dayTotals[dayOfWeek] += seconds;
      // Увеличиваем счетчик для этого дня недели
      dayCounts[dayOfWeek]++;
    });
    
    // Вычисляем среднее время для каждого дня недели
    const averages = dayTotals.map((total, idx) => 
      dayCounts[idx] > 0 ? total / dayCounts[idx] : 0
    );
    
    return { 
      averages: averages.map(seconds => Math.round(seconds / 36) / 100), // Переводим в часы
      counts: dayCounts 
    };
  }, [dailyStats]);
  
  const hasData = weeklyData.counts.some(count => count > 0);
  
  // Если нет данных, отображаем сообщение
  if (!hasData) {
    return <div className="chart-message">Недостаточно данных для отображения тенденций</div>;
  }
  
  const chartData = {
    labels: DAYS_OF_WEEK,
    datasets: [
      {
        label: 'Среднее время работы',
        data: weeklyData.averages,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        tension: 0.3,
      }
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
        text: 'Среднее время работы по дням недели',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const hours = context.raw as number;
            const minutes = Math.round((hours % 1) * 60);
            const idx = context.dataIndex;
            const count = weeklyData.counts[idx];
            
            let label = `${Math.floor(hours)} ч ${minutes} мин`;
            if (count > 0) {
              label += ` (среднее из ${count} ${getCorrectForm(count)})`;
            }
            
            return label;
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
          text: 'День недели'
        }
      }
    }
  };
  
  // Функция для правильного склонения слова "день"
  function getCorrectForm(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastDigit === 1 && lastTwoDigits !== 11) {
      return 'дня';
    } else if (
      (lastDigit === 2 || lastDigit === 3 || lastDigit === 4) &&
      (lastTwoDigits < 10 || lastTwoDigits >= 20)
    ) {
      return 'дня';
    } else {
      return 'дней';
    }
  }
  
  return (
    <div className="chart-container" style={{ height: '400px', marginBottom: '2rem' }}>
      <Line data={chartData} options={options} />
    </div>
  );
};

export default WeeklyTrendsChart; 