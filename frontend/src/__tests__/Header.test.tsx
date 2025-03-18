import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Header from '../components/Header';
import { AuthProvider } from '../context/AuthContext';
import * as authContextModule from '../context/AuthContext';
import * as routerModule from 'react-router-dom';

// Определяем интерфейс User
interface User {
  id: number;
  email: string;
}

// Создаем мок-контекст для тестов
const createMockAuthContext = (isAuthenticated = false, user: User | null = null, logout = jest.fn()) => ({
  isAuthenticated,
  user,
  login: jest.fn(),
  register: jest.fn(),
  logout,
  error: null,
  loading: false,
  isLoading: false,
  changePassword: jest.fn(),
  setError: jest.fn()
});

// Создаем фиктивное местоположение
const createMockLocation = (path: string) => ({
  pathname: path,
  search: '',
  hash: '',
  state: null,
  key: 'default'
});

// Мокаем useNavigate и useLocation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  
  return {
    ...originalModule,
    useNavigate: () => mockNavigate,
    useLocation: jest.fn(),
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  };
});

// Мокаем useAuth
jest.mock('../context/AuthContext', () => ({
  ...jest.requireActual('../context/AuthContext'),
  useAuth: jest.fn()
}));

// Хелпер для рендеринга с определенным путем
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  // Устанавливаем mock для useLocation
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
  });
  
  test('отображает неавторизованное меню для гостя', async () => {
    // Мокаем возвращаемое значение useAuth
    (authContextModule.useAuth as jest.Mock).mockReturnValue(
      createMockAuthContext(false, null)
    );
    
    // Устанавливаем местоположение
    (routerModule.useLocation as jest.Mock).mockReturnValue(createMockLocation('/'));
    
    await act(async () => {
      renderWithRouter(<Header />);
    });
    
    // Проверяем наличие логотипа
    expect(screen.getByText('Трекер времени')).toBeInTheDocument();
    
    // Проверяем наличие ссылок для гостя
    expect(screen.getByText('Вход')).toBeInTheDocument();
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
    
    // Проверяем отсутствие ссылок для авторизованного пользователя
    expect(screen.queryByText('Трекер')).not.toBeInTheDocument();
    expect(screen.queryByText('Статистика')).not.toBeInTheDocument();
    expect(screen.queryByText('Выйти')).not.toBeInTheDocument();
  });
  
  test('отображает авторизованное меню для пользователя', async () => {
    const mockUser: User = { id: 1, email: 'test@example.com' };
    
    // Мокаем возвращаемое значение useAuth
    (authContextModule.useAuth as jest.Mock).mockReturnValue(
      createMockAuthContext(true, mockUser)
    );
    
    // Устанавливаем местоположение
    (routerModule.useLocation as jest.Mock).mockReturnValue(createMockLocation('/'));
    
    await act(async () => {
      renderWithRouter(<Header />);
    });
    
    // Проверяем наличие логотипа
    expect(screen.getByText('Трекер времени')).toBeInTheDocument();
    
    // Проверяем наличие ссылок для авторизованного пользователя
    expect(screen.getByText('Трекер')).toBeInTheDocument();
    expect(screen.getByText('Статистика')).toBeInTheDocument();
    
    // Проверяем наличие информации о пользователе и кнопки выхода
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Выйти')).toBeInTheDocument();
    
    // Проверяем отсутствие ссылок для гостя
    expect(screen.queryByText('Вход')).not.toBeInTheDocument();
    expect(screen.queryByText('Регистрация')).not.toBeInTheDocument();
  });
  
  test('вызывает функцию logout при нажатии на кнопку выхода', async () => {
    const mockUser: User = { id: 1, email: 'test@example.com' };
    const mockLogout = jest.fn().mockImplementation(() => Promise.resolve());
    
    // Мокаем возвращаемое значение useAuth с функцией logout
    (authContextModule.useAuth as jest.Mock).mockReturnValue(
      createMockAuthContext(true, mockUser, mockLogout)
    );
    
    // Устанавливаем местоположение
    (routerModule.useLocation as jest.Mock).mockReturnValue(createMockLocation('/'));
    
    renderWithRouter(<Header />);
    
    // Находим кнопку выхода и нажимаем на неё
    const logoutButton = screen.getByText('Выйти');
    
    await act(async () => {
      fireEvent.click(logoutButton);
      // Ждем, чтобы обработались асинхронные операции
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    // Проверяем, что функция logout была вызвана
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
  
  test('корректно отмечает активную ссылку', async () => {
    const mockUser: User = { id: 1, email: 'test@example.com' };
    
    // Мокаем возвращаемое значение useAuth
    (authContextModule.useAuth as jest.Mock).mockReturnValue(
      createMockAuthContext(true, mockUser)
    );
    
    // Устанавливаем местоположение /statistics
    (routerModule.useLocation as jest.Mock).mockReturnValue(createMockLocation('/statistics'));
    
    await act(async () => {
      renderWithRouter(<Header />, { route: '/statistics' });
    });
    
    // Проверяем, что ссылка на статистику имеет класс active
    const statisticsLink = screen.getByText('Статистика').closest('a');
    expect(statisticsLink).toHaveClass('active');
    
    // Проверяем, что ссылка на трекер не имеет класса active
    const trackerLink = screen.getByText('Трекер').closest('a');
    expect(trackerLink).not.toHaveClass('active');
  });
}); 