import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import Header from '../../components/Header/Header';
import UserMenu from '../../components/Header/UserMenu';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import * as authApi from '../../api/auth';
import * as authContextModule from '../../context/AuthContext';
import * as routerModule from 'react-router-dom';

// Создаем тип для контекста авторизации
interface AuthContextType {
  user: { id: number; email: string } | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  error: string | null;
  loading: boolean;
  isLoading: boolean;
  setError: (error: string | null) => void;
}

// Создаем контекст для тестов
const TestAuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Мокируем хук useNavigate и useLocation
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: jest.fn().mockImplementation(() => ({ pathname: '/' }))
  };
});

// Мокируем API функции
jest.mock('../../api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn().mockImplementation(() => Promise.resolve()),
  getCurrentUser: jest.fn()
}));

// Мокируем localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Создаем мок для контекста авторизации
const mockAuthContext = {
  user: { id: 1, email: 'test@example.com' },
  isAuthenticated: true,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  changePassword: jest.fn(),
  error: null,
  loading: false,
  isLoading: false,
  setError: jest.fn()
};

// Мокируем хук useAuth
jest.mock('../../context/AuthContext', () => ({
  ...jest.requireActual('../../context/AuthContext'),
  useAuth: jest.fn()
}));

// Функция для создания мока location с нужным pathname
const createMockLocation = (path: string) => ({ pathname: path });

// Хелпер для рендеринга компонента с роутером
const renderWithRouter = (ui: React.ReactElement, route = '/') => {
  (routerModule.useLocation as jest.Mock).mockReturnValue(createMockLocation(route));
  
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
    // Сбрасываем мок useLocation на дефолтное значение
    (routerModule.useLocation as jest.Mock).mockReturnValue(createMockLocation('/'));
  });

  test('renders login and registration links when user is not authenticated', () => {
    // Устанавливаем мок для useAuth с неаутентифицированным пользователем
    (authContextModule.useAuth as jest.Mock).mockReturnValue({
      ...mockAuthContext,
      user: null,
      isAuthenticated: false
    });
    
    renderWithRouter(<Header />, '/');
    
    // Проверяем наличие ссылок для гостей
    expect(screen.getByText('Вход')).toBeInTheDocument();
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
    
    // Проверяем отсутствие ссылок для авторизованных пользователей
    expect(screen.queryByText('Трекер')).not.toBeInTheDocument();
    expect(screen.queryByText('Статистика')).not.toBeInTheDocument();
  });

  test('renders user links when user is authenticated', () => {
    // Имитируем аутентифицированного пользователя
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));
    
    // Устанавливаем мок для useAuth с аутентифицированным пользователем
    (authContextModule.useAuth as jest.Mock).mockReturnValue({
      ...mockAuthContext,
      isAuthenticated: true
    });
    
    renderWithRouter(<Header />, '/');
    
    // Проверяем наличие ссылок для авторизованных пользователей
    expect(screen.getByText('Трекер')).toBeInTheDocument();
    expect(screen.getByText('Статистика')).toBeInTheDocument();
    
    // Проверяем отсутствие ссылок для гостей
    expect(screen.queryByText('Вход')).not.toBeInTheDocument();
    expect(screen.queryByText('Регистрация')).not.toBeInTheDocument();
  });

  test('applies active class to current route link', () => {
    // Устанавливаем мок для useAuth с аутентифицированным пользователем
    (authContextModule.useAuth as jest.Mock).mockReturnValue({
      ...mockAuthContext,
      isAuthenticated: true
    });
    
    renderWithRouter(<Header />, '/statistics');
    
    // Проверяем, что ссылка на статистику имеет класс active
    const statisticsLink = screen.getByText('Статистика');
    expect(statisticsLink.className).toContain('active');
    
    // Проверяем, что ссылка на трекер не имеет класса active
    const trackerLink = screen.getByText('Трекер');
    expect(trackerLink.className).not.toContain('active');
  });

  test('logout button calls logout function and redirects to login', async () => {
    // Устанавливаем мок для useAuth с аутентифицированным пользователем
    (authContextModule.useAuth as jest.Mock).mockReturnValue({
      ...mockAuthContext,
      isAuthenticated: true,
      user: { id: 1, email: 'test@example.com' }
    });
    
    renderWithRouter(<UserMenu />, '/');
    
    // Находим и кликаем по кнопке выхода
    const userMenuButton = screen.getByText('test@example.com');
    fireEvent.click(userMenuButton);
    
    const logoutButton = screen.getByText('Выйти');
    fireEvent.click(logoutButton);
    
    // Проверяем, что функция logout была вызвана
    expect(mockAuthContext.logout).toHaveBeenCalled();
  });
});

describe('UserMenu Component', () => {
  // Мок-функция для выхода из системы
  const mockLogout = jest.fn().mockImplementation(() => Promise.resolve());
  
  // Мок-функция для контекста авторизации
  const mockAuthContext: AuthContextType = {
    user: { id: 1, email: 'test@example.com' },
    isAuthenticated: true,
    logout: mockLogout,
    login: jest.fn(),
    register: jest.fn(),
    error: null,
    loading: false,
    isLoading: false,
    changePassword: jest.fn(),
    setError: jest.fn()
  };
  
  beforeEach(() => {
    // Очищаем моки и localStorage перед каждым тестом
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLogout.mockClear();
    localStorage.clear();
    document.body.innerHTML = '';
    
    // Имитируем аутентифицированного пользователя
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));
    
    // Устанавливаем мок для useAuth
    (authContextModule.useAuth as jest.Mock).mockReturnValue(mockAuthContext);
  });

  test('renders user email and shows dropdown menu when clicked', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    // Проверяем отображение email пользователя
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    
    // Проверяем, что меню изначально скрыто
    expect(screen.queryByText('Профиль')).not.toBeInTheDocument();
    
    // Кликаем по кнопке меню
    fireEvent.click(screen.getByText('test@example.com'));
    
    // Проверяем, что меню открылось
    expect(screen.getByText('Профиль')).toBeInTheDocument();
    expect(screen.getByText('Сменить пароль')).toBeInTheDocument();
    expect(screen.getByText('Выйти')).toBeInTheDocument();
  });

  test('hides dropdown menu when clicked outside', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    // Открываем меню
    fireEvent.click(screen.getByText('test@example.com'));
    
    // Проверяем, что меню открылось
    expect(screen.getByText('Профиль')).toBeInTheDocument();
    
    // Кликаем вне меню
    fireEvent.mouseDown(document.body);
    
    // Проверяем, что меню закрылось
    expect(screen.queryByText('Профиль')).not.toBeInTheDocument();
  });

  test('navigates to correct pages when menu items are clicked', () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    // Открываем меню
    fireEvent.click(screen.getByText('test@example.com'));
    
    // Проверяем href для ссылки на профиль
    expect(screen.getByText('Профиль').closest('a')).toHaveAttribute('href', '/profile');
    
    // Проверяем href для ссылки на смену пароля
    expect(screen.getByText('Сменить пароль').closest('a')).toHaveAttribute('href', '/change-password');
  });

  test('calls logout function and redirects to login page when logout button is clicked', async () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    // Открываем меню
    fireEvent.click(screen.getByText('test@example.com'));
    
    // Кликаем по кнопке выхода
    await act(async () => {
      fireEvent.click(screen.getByText('Выйти'));
    });
    
    // Проверяем, что функция logout была вызвана
    expect(mockLogout).toHaveBeenCalled();
    
    // Проверяем, что произошел редирект на страницу логина
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('renders default text when user email is not available', () => {
    // Создаем контекст без пользователя
    const noUserContext = {
      ...mockAuthContext,
      user: null,
      isAuthenticated: false
    };
    
    // Устанавливаем мок для useAuth с контекстом без пользователя
    (authContextModule.useAuth as jest.Mock).mockReturnValue(noUserContext);
    
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    );
    
    // Проверяем отображение текста по умолчанию
    expect(screen.getByText('Пользователь')).toBeInTheDocument();
  });
}); 