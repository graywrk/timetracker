/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SimpleChart from '../../../components/Charts/SimpleChart';

describe('SimpleChart', () => {
  const mockData: Record<string, number> = {
    'Янв': 5,
    'Фев': 10,
    'Мар': 15,
    'Апр': 7,
    'Май': 12
  };
  
  const mockCategoryData: Record<string, number> = {
    'Работа': 40,
    'Учёба': 35,
    'Отдых': 25
  };

  test('рендерит график без ошибок', () => {
    render(<SimpleChart data={mockData} title="Тестовый график" />);
    
    expect(screen.getByText('Тестовый график')).toBeInTheDocument();
    expect(document.querySelector('.simple-chart-container')).toBeInTheDocument();
    
    // Проверяем, что все метки отображаются
    Object.keys(mockData).forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    
    // Проверяем, что все значения отображаются
    Object.values(mockData).forEach(value => {
      expect(screen.getByText(value.toString())).toBeInTheDocument();
    });
  });

  test('рендерит график с данными категорий', () => {
    render(<SimpleChart data={mockCategoryData} title="График по категориям" />);
    
    expect(screen.getByText('График по категориям')).toBeInTheDocument();
    
    // Проверяем, что все метки категорий отображаются
    Object.keys(mockCategoryData).forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  test('корректно отображает график без данных', () => {
    render(<SimpleChart data={{}} title="Пустой график" />);
    
    expect(screen.getByText('Пустой график')).toBeInTheDocument();
    expect(document.querySelector('.simple-chart-container')).toBeInTheDocument();
    // Контейнер должен быть пустым, т.к. нет данных для отображения
    expect(document.querySelector('.simple-chart-container')?.children.length).toBe(0);
  });
}); 