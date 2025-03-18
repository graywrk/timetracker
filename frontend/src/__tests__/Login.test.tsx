import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../components/Auth/Login';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';

// Мокаем API-функции
jest.mock('../api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn()
}));

// Мокаем useNavigate для предотвращения переходов
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Настройка localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Хелпер для рендеринга компонента с провайдерами
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
};

// Создает JWT токен для тестов
const createTestJWT = () => {
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3NDIyMTQ3OTJ9.test_signature";
};

describe('Login Component', () => {
  beforeEach(() => {
    // Очищаем моки и localStorage перед каждым тестом
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  test('отображает форму входа корректно', () => {
    renderWithProviders(<Login />);
    
    // Проверяем наличие всех элементов формы
    expect(screen.getByText('Вход в систему')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Войти/i })).toBeInTheDocument();
    expect(screen.getByText('Нет аккаунта? Зарегистрироваться')).toBeInTheDocument();
  });

  test('позволяет заполнить и отправить форму входа', async () => {
    // Создаем JWT токен для теста
    const mockToken = createTestJWT();
    
    // Подготавливаем успешный ответ от API
    const mockLoginResponse = {
      token: mockToken,
      user: { id: 1, email: 'test@example.com' }
    };
    
    // Настраиваем мок на успешное выполнение
    (authApi.login as jest.Mock).mockResolvedValue(mockLoginResponse);
    
    // Мокаем функции localStorage, чтобы тест мог проверить их вызов
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = jest.fn((key, value) => {
      return originalSetItem(key, value);
    });
    
    // Рендерим компонент
    renderWithProviders(<Login />);
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText('Email'), { 
      target: { value: 'test@example.com' } 
    });
    
    fireEvent.change(screen.getByLabelText('Пароль'), { 
      target: { value: 'password123' } 
    });
    
    // Отправляем форму
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Войти/i }));
    });
    
    // Проверяем, что API был вызван с правильными параметрами
    expect(authApi.login).toHaveBeenCalledWith(
      'test@example.com',
      'password123'
    );
    
    // Проверяем, что токен и данные пользователя были сохранены
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'user', 
      JSON.stringify({ id: 1, email: 'test@example.com' })
    );
  });
  
  test('показывает сообщение об ошибке при неудачной авторизации', async () => {
    // Настраиваем мок для симуляции ошибки
    const errorMessage = 'Неверный логин или пароль';
    (authApi.login as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    // Рендерим компонент
    renderWithProviders(<Login />);
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText('Email'), { 
      target: { value: 'test@example.com' } 
    });
    
    fireEvent.change(screen.getByLabelText('Пароль'), { 
      target: { value: 'wrong_password' } 
    });
    
    // Отправляем форму
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Войти/i }));
    });
    
    // Ожидаем появления сообщения об ошибке
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    
    // Проверяем, что localStorage не получал вызовов setItem с token
    expect(localStorageMock.setItem).not.toHaveBeenCalledWith('token', expect.anything());
  });
  
  test('переключает видимость пароля при нажатии на кнопку', () => {
    renderWithProviders(<Login />);
    
    // Находим поле пароля и кнопку видимости
    const passwordInput = screen.getByLabelText('Пароль');
    const toggleButton = screen.getByRole('button', { name: /Показать/i });
    
    // Проверяем начальное состояние (пароль скрыт)
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Нажимаем кнопку видимости
    fireEvent.click(toggleButton);
    
    // Проверяем, что пароль стал видимым
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Нажимаем еще раз для скрытия пароля
    fireEvent.click(toggleButton);
    
    // Проверяем, что пароль снова скрыт
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
  
  test('валидирует данные формы перед отправкой', async () => {
    renderWithProviders(<Login />);
    
    // Отправляем пустую форму
    fireEvent.click(screen.getByRole('button', { name: /Войти/i }));
    
    // Ожидаем появления сообщения об ошибке валидации
    expect(screen.getByText('Пожалуйста, заполните все поля')).toBeInTheDocument();
    
    // Проверяем, что API не был вызван
    expect(authApi.login).not.toHaveBeenCalled();
    
    // Заполняем только Email
    fireEvent.change(screen.getByLabelText('Email'), { 
      target: { value: 'test@example.com' } 
    });
    
    // Отправляем форму
    fireEvent.click(screen.getByRole('button', { name: /Войти/i }));
    
    // Ожидаем появления сообщения об ошибке валидации
    expect(screen.getByText('Пожалуйста, заполните все поля')).toBeInTheDocument();
    
    // Проверяем, что API не был вызван
    expect(authApi.login).not.toHaveBeenCalled();
  });
  
  test('проверяет формат Email', async () => {
    // Переопределяем мок для этого теста
    (authApi.login as jest.Mock).mockImplementation((email) => {
      if (!email.includes('@')) {
        throw new Error('Пожалуйста, введите корректный email адрес');
      }
      return Promise.resolve({
        token: createTestJWT(),
        user: { id: 1, email }
      });
    });
    
    renderWithProviders(<Login />);
    
    // Заполняем неверный формат Email
    fireEvent.change(screen.getByLabelText('Email'), { 
      target: { value: 'invalid-email' } 
    });
    
    // Заполняем пароль
    fireEvent.change(screen.getByLabelText('Пароль'), { 
      target: { value: 'password123' } 
    });
    
    // Отправляем форму с некорректным email
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Войти/i }));
    });
    
    // Проверяем что API был вызван, так как валидация на уровне компонента пропускает этот email
    expect(authApi.login).toHaveBeenCalled();
    
    // Проверяем сообщение об ошибке от API
    expect(await screen.findByText('Пожалуйста, введите корректный email адрес')).toBeInTheDocument();
  });
}); 