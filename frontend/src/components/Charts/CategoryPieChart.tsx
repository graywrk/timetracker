import React from 'react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend
} from 'chart.js';
import type { ChartOptions as ChartOptionsType, TooltipItem as TooltipItemType } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { TimeEntry } from '../../api/statistics';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

// Интерфейс для контекста
interface TooltipContext {
  raw: unknown;
  label?: string;
}

interface CategoryPieChartProps {
  entries: TimeEntry[];
}

interface CategoryData {
  name: string;
  color: string;
  duration: number;
}

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ entries }) => {
  // Функция для вычисления продолжительности записи в секундах
  const calculateDuration = (entry: TimeEntry): number => {
    if (!entry.end_time) return 0;
    
    const startTime = new Date(entry.start_time);
    const endTime = new Date(entry.end_time);
    const durationMs = endTime.getTime() - startTime.getTime();
    // Вычитаем время на паузе
    return Math.floor(durationMs / 1000) - (entry.total_paused || 0);
  };
  
  // Группировка данных по категориям
  const getCategoryData = (): CategoryData[] => {
    const categoryMap = new Map<string | number, CategoryData>();
    
    // Добавляем запись "Без категории"
    categoryMap.set('uncategorized', {
      name: 'Без категории',
      color: '#cccccc',
      duration: 0
    });
    
    // Обрабатываем только завершенные записи
    const completedEntries = entries.filter(entry => entry.status === 'completed');
    
    completedEntries.forEach(entry => {
      const duration = calculateDuration(entry);
      
      if (entry.category) {
        const categoryId = entry.category.id;
        
        if (categoryMap.has(categoryId)) {
          const category = categoryMap.get(categoryId)!;
          category.duration += duration;
        } else {
          categoryMap.set(categoryId, {
            name: entry.category.name,
            color: entry.category.color,
            duration: duration
          });
        }
      } else {
        // Если нет категории, добавляем к "Без категории"
        const uncategorized = categoryMap.get('uncategorized')!;
        uncategorized.duration += duration;
      }
    });
    
    // Удаляем категорию "Без категории", если в ней нет значений
    if (categoryMap.get('uncategorized')!.duration === 0) {
      categoryMap.delete('uncategorized');
    }
    
    return Array.from(categoryMap.values());
  };
  
  const categoryData = getCategoryData();
  
  // Если нет данных, отображаем сообщение
  if (categoryData.length === 0) {
    return <div className="chart-message">Нет данных для отображения</div>;
  }
  
  // Функция для форматирования времени
  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0 ч 0 мин';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours} ч ${minutes} мин`;
  };
  
  const chartData = {
    labels: categoryData.map(cat => cat.name),
    datasets: [
      {
        data: categoryData.map(cat => cat.duration),
        backgroundColor: categoryData.map(cat => cat.color),
        borderColor: categoryData.map(cat => cat.color),
        borderWidth: 1,
      },
    ],
  };
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      title: {
        display: true,
        text: 'Распределение времени по категориям',
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (context: TooltipContext) => {
            const duration = context.raw as number;
            const label = context.label || '';
            const percentage = Math.round((duration / categoryData.reduce((sum, cat) => sum + cat.duration, 0)) * 100);
            return `${label}: ${formatDuration(duration)} (${percentage}%)`;
          }
        }
      }
    }
  };
  
  return (
    <div className="chart-container" style={{ height: '400px', marginBottom: '2rem' }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default CategoryPieChart; 