/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatisticsCharts from '../../../components/Charts/StatisticsCharts';
import { TimeStats, TimeEntry } from '../../../api/statistics';

// Мокаем SimpleChart
jest.mock('../../../components/Charts/SimpleChart', () => {
  return function MockSimpleChart({ title, data }: { title: string, data: Record<string, number> }) {
    return (
      <div data-testid="mock-simple-chart" className="mock-simple-chart">
        <div className="mock-title">{title}</div>
        <div className="mock-data">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="mock-data-item">
              {key}: {value}
            </div>
          ))}
        </div>
      </div>
    );
  };
});

describe('StatisticsCharts', () => {
  const mockTimeEntries: TimeEntry[] = [
    {
      id: 1,
      user_id: 1,
      status: 'completed',
      start_time: '2023-01-01T10:00:00Z',
      end_time: '2023-01-01T12:00:00Z',
      total_paused: 0,
      category: {
        id: 1,
        name: 'Работа',
        color: '#FF0000',
        user_id: 1
      }
    },
    {
      id: 2,
      user_id: 1,
      status: 'completed',
      start_time: '2023-01-02T13:00:00Z',
      end_time: '2023-01-02T14:30:00Z',
      total_paused: 300, // 5 минут
      category: {
        id: 2,
        name: 'Учёба',
        color: '#00FF00',
        user_id: 1
      }
    },
    {
      id: 3,
      user_id: 1,
      status: 'completed',
      start_time: '2023-01-03T15:00:00Z',
      end_time: '2023-01-03T16:00:00Z',
      total_paused: 0,
      category: undefined
    }
  ];

  const mockStats: TimeStats = {
    total_duration: 16200, // 4.5 часа в секундах
    average_daily_hours: 1.5,
    longest_session: 7200, // 2 часа в секундах
    longest_session_date: '2023-01-01',
    daily_stats: {
      '2023-01-01': 7200, // 2 часа
      '2023-01-02': 5400, // 1.5 часа
      '2023-01-03': 3600, // 1 час
    },
    entries: mockTimeEntries
  };

  test('рендерит графики без ошибок', () => {
    render(<StatisticsCharts stats={mockStats} />);
    
    expect(screen.getByText('Аналитика рабочего времени')).toBeInTheDocument();
    
    // Проверяем наличие всех трех графиков
    const charts = screen.getAllByTestId('mock-simple-chart');
    expect(charts).toHaveLength(3);
    
    // Проверяем заголовки графиков
    expect(screen.getByText('Ежедневное рабочее время')).toBeInTheDocument();
    expect(screen.getByText('Распределение по категориям')).toBeInTheDocument();
    expect(screen.getByText('Тенденции по дням недели')).toBeInTheDocument();
  });

  test('отображает сообщение загрузки, когда статистика отсутствует', () => {
    render(<StatisticsCharts stats={null as unknown as TimeStats} />);
    
    expect(screen.getByText('Загрузка данных...')).toBeInTheDocument();
  });

  test('корректно обрабатывает отсутствие записей в статистике', () => {
    const emptyStats: TimeStats = {
      ...mockStats,
      entries: [],
      daily_stats: {}
    };
    
    render(<StatisticsCharts stats={emptyStats} />);
    
    // Графики все равно должны отрендериться, даже если данных нет
    expect(screen.getAllByTestId('mock-simple-chart')).toHaveLength(3);
  });
}); 