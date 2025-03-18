/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WeeklyTrendsChart from '../../../components/Charts/WeeklyTrendsChart';

// Мокаем Chart.js компоненты
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart">Line Chart</div>
}));

describe('WeeklyTrendsChart', () => {
  const mockDailyStats = {
    '2023-01-01': 7200, // Воскресенье
    '2023-01-02': 5400, // Понедельник
    '2023-01-03': 3600, // Вторник
    '2023-01-04': 9000, // Среда
    '2023-01-05': 7200, // Четверг
    '2023-01-06': 3600, // Пятница
    '2023-01-07': 1800  // Суббота
  };

  test('рендерит график без ошибок', () => {
    render(<WeeklyTrendsChart dailyStats={mockDailyStats} />);
    
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });

  test('отображает сообщение, когда нет данных', () => {
    render(<WeeklyTrendsChart dailyStats={{}} />);
    
    expect(screen.getByText('Недостаточно данных для отображения тенденций')).toBeInTheDocument();
  });

  test('корректно обрабатывает неделю без данных', () => {
    const gappedStats = {
      '2023-01-01': 7200, // Только воскресенье
      '2023-01-15': 3600  // Через две недели, тоже воскресенье
    };
    
    render(<WeeklyTrendsChart dailyStats={gappedStats} />);
    
    expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
  });
});