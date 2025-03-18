import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategorySelect from '../CategorySelect';
import { getCategories, createCategory } from '../../api/timetracker';

// Мокаем API-функции
jest.mock('../../api/timetracker', () => ({
  getCategories: jest.fn(),
  createCategory: jest.fn().mockResolvedValue({ id: 3, name: 'Новая категория', color: '#0000FF', user_id: 1 }),
}));

const mockCategories = [
  { id: 1, name: 'Работа', color: '#FF0000', user_id: 1 },
  { id: 2, name: 'Учеба', color: '#00FF00', user_id: 1 }
];

describe('Компонент CategorySelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getCategories as jest.Mock).mockResolvedValue(mockCategories);
  });

  it('должен отображать список категорий', async () => {
    render(<CategorySelect selectedCategoryId={null} onCategorySelect={() => {}} />);
    
    // Проверяем загрузку
    expect(screen.getByText('Загрузка категорий...')).toBeInTheDocument();
    
    // Проверяем отображение кнопки выбора категории после загрузки
    await waitFor(() => {
      expect(screen.getByText('Выберите категорию')).toBeInTheDocument();
    });
  });

  it('должен вызывать onCategorySelect при автоматическом выборе первой категории', async () => {
    const mockOnCategorySelect = jest.fn();
    render(<CategorySelect selectedCategoryId={null} onCategorySelect={mockOnCategorySelect} />);
    
    await waitFor(() => {
      expect(mockOnCategorySelect).toHaveBeenCalledWith(1);
    });
  });

  it('должен отображать выбранную категорию', async () => {
    render(<CategorySelect selectedCategoryId={1} onCategorySelect={() => {}} />);
    
    await waitFor(() => {
      // Ищем все элементы с текстом "Работа" и проверяем, что хотя бы один существует
      const elements = screen.getAllByText('Работа');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it('должен показывать сообщение об ошибке при неудачной загрузке', async () => {
    (getCategories as jest.Mock).mockRejectedValue(new Error('Не удалось загрузить категории'));
    
    render(<CategorySelect selectedCategoryId={null} onCategorySelect={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByText('Ошибка загрузки категорий')).toBeInTheDocument();
    });
  });

  it('должен отображать форму создания новой категории', async () => {
    render(<CategorySelect selectedCategoryId={null} onCategorySelect={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /выберите категорию/i })).toBeInTheDocument();
    });
    
    // Bootstrap требует DOM для работы dropdowns, поэтому мы не можем полностью протестировать раскрытие меню
    // Вместо этого найдем элемент "Создать новую" напрямую и симулируем нажатие
    const createNewButton = screen.getByText('Создать новую');
    fireEvent.click(createNewButton);
    
    expect(screen.getByText('Создание новой категории')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Название категории')).toBeInTheDocument();
    expect(screen.getByText(/Выбрать цвет/i)).toBeInTheDocument();
  });

  it('должен создавать новую категорию', async () => {
    const mockOnCategorySelect = jest.fn();
    
    // Устанавливаем реализацию createCategory, которая возвращает объект с id=3
    (createCategory as jest.Mock).mockImplementation(() => {
      return Promise.resolve({ id: 3, name: 'Новая категория', color: '#4a6bff', user_id: 1 });
    });
    
    render(<CategorySelect selectedCategoryId={null} onCategorySelect={mockOnCategorySelect} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /выберите категорию/i })).toBeInTheDocument();
    });
    
    // Симулируем нажатие на "Создать новую"
    const createNewButton = screen.getByText('Создать новую');
    fireEvent.click(createNewButton);
    
    // Заполняем поле названия категории
    const nameInput = screen.getByPlaceholderText('Название категории');
    fireEvent.change(nameInput, { target: { value: 'Новая категория' } });
    
    // Отправляем форму
    const submitButton = screen.getByRole('button', { name: /создать$/i });
    fireEvent.click(submitButton);
    
    // Проверяем, что API-функция createCategory была вызвана с правильными параметрами
    await waitFor(() => {
      expect(createCategory).toHaveBeenCalledWith('Новая категория', '#4a6bff');
    });
    
    // Проверяем, что onCategorySelect была вызвана с ID новой категории=3
    await waitFor(() => {
      expect(mockOnCategorySelect).toHaveBeenCalledWith(3);
    });
  });

  it('должен показывать ошибку при создании категории с пустым названием', async () => {
    render(<CategorySelect selectedCategoryId={null} onCategorySelect={() => {}} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /выберите категорию/i })).toBeInTheDocument();
    });
    
    // Симулируем нажатие на "Создать новую"
    const createNewButton = screen.getByText('Создать новую');
    fireEvent.click(createNewButton);
    
    // Отправляем форму без заполнения поля названия
    const submitButton = screen.getByRole('button', { name: /создать$/i });
    fireEvent.click(submitButton);
    
    // Проверяем, что появилось сообщение об ошибке
    expect(screen.getByText('Название категории не может быть пустым')).toBeInTheDocument();
    
    // Проверяем, что API-функция createCategory не была вызвана
    expect(createCategory).not.toHaveBeenCalled();
  });
}); 