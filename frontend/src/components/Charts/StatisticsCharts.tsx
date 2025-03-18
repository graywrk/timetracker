import React from 'react';
import { TimeStats } from '../../api/statistics';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import './charts.css';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface StatisticsChartsProps {
  stats: TimeStats;
}

const StatisticsCharts: React.FC<StatisticsChartsProps> = ({ stats }) => {
  if (!stats) {
    return <div className="charts-loading">Загрузка данных...</div>;
  }
  
  // Функция для форматирования даты
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit',
      month: '2-digit'
    });
  };
  
  // Функция для группировки данных по дням недели
  const getWeekdayData = (): { labels: string[], data: number[] } => {
    // Названия дней недели
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    
    // Счетчики и суммы по дням недели
    const counts: Record<string, number> = {};
    const sums: Record<string, number> = {};
    
    Object.entries(stats.daily_stats).forEach(([dateStr, duration]) => {
      const date = new Date(dateStr);
      const day = weekdays[date.getDay()];
      
      if (!counts[day]) {
        counts[day] = 0;
        sums[day] = 0;
      }
      
      counts[day]++;
      sums[day] += duration;
    });
    
    // Вычисляем средние значения
    const result: Record<string, number> = {};
    weekdays.forEach(day => {
      if (counts[day]) {
        // Переводим секунды в часы
        result[day] = Math.round((sums[day] / counts[day]) / 3600 * 100) / 100;
      } else {
        result[day] = 0;
      }
    });
    
    // Возвращаем данные в формате для Chart.js
    return {
      labels: weekdays,
      data: weekdays.map(day => result[day] || 0)
    };
  };
  
  // Функция для группировки данных по категориям
  const getCategoryData = (): { labels: string[], data: number[] } => {
    const categoriesMap: Record<string, number> = {
      'Без категории': 0
    };
    
    if (!stats.entries || stats.entries.length === 0) {
      return { labels: [], data: [] };
    }
    
    stats.entries.forEach(entry => {
      if (!entry.end_time) return;
      
      const startTime = new Date(entry.start_time);
      const endTime = new Date(entry.end_time);
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - (entry.total_paused || 0);
      
      if (entry.category) {
        const categoryName = entry.category.name;
        categoriesMap[categoryName] = (categoriesMap[categoryName] || 0) + duration / 3600;
      } else {
        categoriesMap['Без категории'] += duration / 3600;
      }
    });
    
    // Удаляем категорию "Без категории", если в ней нет значений
    if (categoriesMap['Без категории'] === 0) {
      delete categoriesMap['Без категории'];
    }
    
    // Округляем значения до 2 знаков после запятой
    Object.keys(categoriesMap).forEach(key => {
      categoriesMap[key] = Math.round(categoriesMap[key] * 100) / 100;
    });
    
    // Возвращаем данные в формате для Chart.js
    return {
      labels: Object.keys(categoriesMap),
      data: Object.values(categoriesMap)
    };
  };
  
  // Преобразуем данные о ежедневной статистике для графика
  const getDailyData = (): { labels: string[], data: number[] } => {
    const dailyEntries = Object.entries(stats.daily_stats)
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .slice(-7); // Показываем только последние 7 дней
    
    return {
      labels: dailyEntries.map(([date]) => formatDate(date)),
      data: dailyEntries.map(([, duration]) => Math.round(duration / 3600 * 100) / 100) // Часы с округлением
    };
  };
  
  // Данные для графиков
  const dailyChartData = getDailyData();
  const weekdayChartData = getWeekdayData();
  const categoryChartData = getCategoryData();
  
  // Создание случайных цветов для графиков
  const generateColors = (count: number): string[] => {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * 200 + 55);
      const g = Math.floor(Math.random() * 200 + 55);
      const b = Math.floor(Math.random() * 200 + 55);
      colors.push(`rgba(${r}, ${g}, ${b}, 0.7)`);
    }
    return colors;
  };
  
  // Настройки для графиков
  const categoryColors = generateColors(categoryChartData.labels.length);
  const weekdayColors = [
    'rgba(255, 99, 132, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
    'rgba(199, 199, 199, 0.7)',
  ];
  
  return (
    <div className="statistics-charts">
      <h2 className="charts-title">Аналитика рабочего времени</h2>
      
      <div className="charts-container">
        <div className="chart-panel">
          <h3 className="chart-title">Ежедневное рабочее время</h3>
          <div className="chart-container">
            {dailyChartData.labels.length > 0 ? (
              <Bar 
                data={{
                  labels: dailyChartData.labels,
                  datasets: [
                    {
                      label: 'Часы работы',
                      data: dailyChartData.data,
                      backgroundColor: 'rgba(75, 192, 192, 0.7)',
                      borderColor: 'rgba(75, 192, 192, 1)',
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Часы'
                      }
                    }
                  },
                  plugins: {
                    title: {
                      display: true,
                      text: 'Часы работы за последние дни'
                    },
                    legend: {
                      display: false
                    }
                  }
                }}
              />
            ) : (
              <div className="chart-message">Нет данных для отображения</div>
            )}
          </div>
        </div>
        
        <div className="chart-panel">
          <h3 className="chart-title">Распределение по категориям</h3>
          <div className="chart-container">
            {categoryChartData.labels.length > 0 ? (
              <Pie 
                data={{
                  labels: categoryChartData.labels,
                  datasets: [
                    {
                      data: categoryChartData.data,
                      backgroundColor: categoryColors,
                      borderColor: categoryColors.map(color => color.replace('0.7', '1')),
                      borderWidth: 1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Распределение времени по категориям (часы)'
                    },
                    legend: {
                      position: 'right',
                      align: 'center'
                    }
                  }
                }}
              />
            ) : (
              <div className="chart-message">Нет данных для отображения</div>
            )}
          </div>
        </div>
        
        <div className="chart-panel">
          <h3 className="chart-title">Тенденции по дням недели</h3>
          <div className="chart-container">
            {weekdayChartData.labels.length > 0 ? (
              <Line 
                data={{
                  labels: weekdayChartData.labels,
                  datasets: [
                    {
                      label: 'Среднее время (часы)',
                      data: weekdayChartData.data,
                      backgroundColor: weekdayColors,
                      borderColor: 'rgba(75, 192, 192, 1)',
                      borderWidth: 2,
                      fill: false,
                      tension: 0.3
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Часы'
                      }
                    }
                  },
                  plugins: {
                    title: {
                      display: true,
                      text: 'Среднее время по дням недели'
                    }
                  }
                }}
              />
            ) : (
              <div className="chart-message">Нет данных для отображения</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsCharts; 