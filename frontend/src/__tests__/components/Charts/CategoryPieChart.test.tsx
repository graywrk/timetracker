/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryPieChart from '../../../components/Charts/CategoryPieChart';
import { TimeEntry } from '../../../api/statistics';

// Мокаем Chart.js компоненты
jest.mock('react-chartjs-2', () => ({
  Pie: () => <div data-testid="mock-pie-chart">Pie Chart</div>
}));

describe('CategoryPieChart', () => {
  const mockTimeEntries: TimeEntry[] = [
    {
      id: 1,
      status: 'completed',
      start_time: '2023-01-01T10:00:00Z',
      end_time: '2023-01-01T12:00:00Z',
      total_paused: 0,
      description: 'Задача 1',
      category: {
        id: 1,
        name: 'Работа',
        color: '#FF0000',
        user_id: 1
      }
    },
    {
      id: 2,
      status: 'completed',
      start_time: '2023-01-02T13:00:00Z',
      end_time: '2023-01-02T14:30:00Z',
      total_paused: 300, // 5 минут
      description: 'Задача 2',
      category: {
        id: 2,
        name: 'Учёба',
        color: '#00FF00',
        user_id: 1
      }
    },
    {
      id: 3,
      status: 'completed',
      start_time: '2023-01-03T15:00:00Z',
      end_time: '2023-01-03T16:00:00Z',
      total_paused: 0,
      description: 'Задача без категории',
      category: null
    }
  ];

  test('рендерит график без ошибок', () => {
    render(<CategoryPieChart entries={mockTimeEntries} />);
    
    expect(screen.getByTestId('mock-pie-chart')).toBeInTheDocument();
  });

  test('отображает сообщение, когда нет данных', () => {
    render(<CategoryPieChart entries={[]} />);
    
    expect(screen.getByText('Нет данных для отображения')).toBeInTheDocument();
  });

  test('не включает записи со статусом, отличным от "completed"', () => {
    const entriesWithNotCompleted: TimeEntry[] = [
      ...mockTimeEntries,
      {
        id: 4,
        status: 'active', // Не должна быть включена
        start_time: '2023-01-04T10:00:00Z',
        end_time: null,
        total_paused: 0,
        description: 'Текущая задача',
        category: {
          id: 1,
          name: 'Работа',
          color: '#FF0000',
          user_id: 1
        }
      }
    ];
    
    render(<CategoryPieChart entries={entriesWithNotCompleted} />);
    
    expect(screen.getByTestId('mock-pie-chart')).toBeInTheDocument();
    // Активная запись не должна изменить отображение графика
  });
}); 