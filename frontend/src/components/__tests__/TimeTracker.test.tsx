import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';
import TimeTracker from '../TimeTracker';
import { 
  getActiveTimeEntry, 
  startTimeEntryWithCategory,
  pauseTimeEntry,
  resumeTimeEntry,
  stopTimeEntry,
  getCategories
} from '../../api/timetracker';

// Мокаем импорт CategorySelect
jest.mock('../CategorySelect', () => {
  return function MockCategorySelect({ selectedCategoryId, onCategorySelect }: any) {
    return (
      <div data-testid="category-select">
        <button onClick={() => onCategorySelect(1)}>Выбрать Работу</button>
        <button onClick={() => onCategorySelect(2)}>Выбрать Учебу</button>
      </div>
    );
  };
});

// Мокаем API-функции
jest.mock('../../api/timetracker', () => ({
  getActiveTimeEntry: jest.fn(),
  startTimeEntry: jest.fn(),
  startTimeEntryWithCategory: jest.fn(),
  pauseTimeEntry: jest.fn(),
  resumeTimeEntry: jest.fn(),
  stopTimeEntry: jest.fn(),
  getCategories: jest.fn(),
}));

describe('Компонент TimeTracker с категориями', () => {
  beforeEach(() => {
    // Очищаем все моки перед каждым тестом
    jest.clearAllMocks();
    
    // Мокаем возвращаемые данные
    (getActiveTimeEntry as jest.Mock).mockResolvedValue(null);
    (getCategories as jest.Mock).mockResolvedValue([
      { id: 1, name: 'Работа', color: '#FF0000' },
      { id: 2, name: 'Учеба', color: '#0000FF' }
    ]);
  });

  it('должен отображать компонент выбора категории, когда нет активного таймера', async () => {
    await act(async () => {
      render(<TimeTracker />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Выберите категорию')).toBeInTheDocument();
      expect(screen.getByTestId('category-select')).toBeInTheDocument();
    });
  });

  it('должен вызывать startTimeEntryWithCategory при выборе категории и нажатии "Начать"', async () => {
    const mockTimeEntry = {
      id: 1,
      user_id: 1,
      start_time: new Date().toISOString(),
      end_time: null,
      status: 'active',
      total_paused: 0,
      category_id: 1,
      category: { id: 1, name: 'Работа', color: '#FF0000', user_id: 1 }
    };
    
    console.log('Настройка мока startTimeEntryWithCategory');
    (startTimeEntryWithCategory as jest.Mock).mockResolvedValue(mockTimeEntry);
    
    console.log('Рендеринг компонента TimeTracker');
    const { debug } = render(<TimeTracker />);
    
    // Сразу заворачиваем рендер в act для обработки эффектов 
    await act(async () => {
      // Ждем выполнения асинхронных операций
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Ждем, пока компонент загрузится
    await waitFor(() => {
      console.log('Проверка наличия кнопки "Выбрать Работу"');
      expect(screen.getByText('Выбрать Работу')).toBeInTheDocument();
    });
    
    // Выводим DOM для отладки
    console.log('DOM перед выбором категории:');
    debug();
    
    // Выбираем категорию
    await act(async () => {
      console.log('Нажатие на кнопку "Выбрать Работу"');
      fireEvent.click(screen.getByText('Выбрать Работу'));
    });
    
    // Добавляем задержку, чтобы состояние успело обновиться
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    console.log('DOM после выбора категории:');
    debug();
    
    // Нажимаем "Начать"
    await act(async () => {
      console.log('Нажатие на кнопку "Начать"');
      fireEvent.click(screen.getByText('Начать'));
    });
    
    // Добавляем задержку, чтобы запрос успел выполниться
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    // Проверяем, что функция startTimeEntryWithCategory была вызвана с правильным ID категории
    console.log('Проверка вызова startTimeEntryWithCategory');
    console.log('Количество вызовов:', (startTimeEntryWithCategory as jest.Mock).mock.calls.length);
    if ((startTimeEntryWithCategory as jest.Mock).mock.calls.length > 0) {
      console.log('Аргументы вызова:', (startTimeEntryWithCategory as jest.Mock).mock.calls[0]);
    }
    expect(startTimeEntryWithCategory).toHaveBeenCalledWith(1);
  });

  it('должен отображать название категории при активном таймере', async () => {
    const mockTimeEntry = {
      id: 1,
      user_id: 1,
      start_time: new Date().toISOString(),
      end_time: null,
      status: 'active',
      total_paused: 0,
      category_id: 1,
      category: { id: 1, name: 'Работа', color: '#FF0000', user_id: 1 }
    };
    
    // Устанавливаем активную запись времени
    (getActiveTimeEntry as jest.Mock).mockResolvedValue(mockTimeEntry);
    
    await act(async () => {
      render(<TimeTracker />);
    });
    
    // Проверяем, что отображается название категории
    await waitFor(() => {
      expect(screen.getByText('Работа')).toBeInTheDocument();
    });
    
    // Проверяем, что кнопка "Пауза" отображается
    expect(screen.getByText('Пауза')).toBeInTheDocument();
  });

  it('должен переключаться между состояниями при нажатии на кнопки управления таймером', async () => {
    // Начальное состояние - активная запись
    const activeEntry = {
      id: 1,
      user_id: 1,
      start_time: new Date().toISOString(),
      end_time: null,
      status: 'active',
      total_paused: 0,
      category_id: 1,
      category: { id: 1, name: 'Работа', color: '#FF0000', user_id: 1 }
    };
    
    // Запись на паузе
    const pausedEntry = { ...activeEntry, status: 'paused' };
    
    // Возобновленная запись
    const resumedEntry = { ...activeEntry, status: 'active' };
    
    // Мокаем API-вызовы для разных состояний
    (getActiveTimeEntry as jest.Mock).mockResolvedValue(activeEntry);
    (pauseTimeEntry as jest.Mock).mockResolvedValue(pausedEntry);
    (resumeTimeEntry as jest.Mock).mockResolvedValue(resumedEntry);
    (stopTimeEntry as jest.Mock).mockResolvedValue({ ...activeEntry, status: 'completed', end_time: new Date().toISOString() });
    
    await act(async () => {
      render(<TimeTracker />);
    });
    
    // Ждем загрузки компонента
    await waitFor(() => {
      expect(screen.getByText('Пауза')).toBeInTheDocument();
    });
    
    // Нажимаем "Пауза"
    await act(async () => {
      fireEvent.click(screen.getByText('Пауза'));
    });
    
    // Проверяем, что функция pauseTimeEntry была вызвана с правильным ID
    await waitFor(() => {
      expect(pauseTimeEntry).toHaveBeenCalledWith(1);
    });
    
    // Мокаем getActiveTimeEntry для обновления состояния 
    (getActiveTimeEntry as jest.Mock).mockResolvedValue(pausedEntry);
    
    // Перерендериваем для получения обновленного состояния
    await act(async () => {
      render(<TimeTracker />);
    });
    
    // Проверяем, что теперь отображается кнопка "Продолжить"
    await waitFor(() => {
      const continueButtons = screen.getAllByText('Продолжить');
      expect(continueButtons[0]).toBeInTheDocument();
    });
  });
}); 