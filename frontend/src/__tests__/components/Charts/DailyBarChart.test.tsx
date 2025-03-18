/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyBarChart from '../../../components/Charts/DailyBarChart';

// Мокаем Chart.js компоненты
jest.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-bar-chart">Bar Chart</div>
}));

describe('DailyBarChart', () => {
  const mockDailyStats = {
    '2023-01-01': 7200, // 2 часа в секундах
    '2023-01-02': 10800, // 3 часа в секундах
    '2023-01-03': 5400, // 1.5 часа в секундах
    '2023-01-04': 0, // 0 часов
    '2023-01-05': 3600, // 1 час в секундах
  };

  test('рендерит график без ошибок', () => {
    render(<DailyBarChart dailyStats={mockDailyStats} />);
    
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
  });

  test('отображает сообщение, когда нет данных', () => {
    render(<DailyBarChart dailyStats={{}} />);
    
    expect(screen.getByText('Нет данных для отображения')).toBeInTheDocument();
  });

  test('корректно отображает график с одним днем данных', () => {
    const singleDayStats = {
      '2023-01-01': 7200 // 2 часа в секундах
    };
    
    render(<DailyBarChart dailyStats={singleDayStats} />);
    
    expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
  });
}); 