import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChangePassword from '../../components/Auth/ChangePassword';
import { AuthProvider } from '../../context/AuthContext';
import * as authApi from '../../api/auth';

// Мокируем хук useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Мокируем API функции
jest.mock('../../api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
  changePassword: jest.fn()
}));

// Мокируем глобальный setTimeout
jest.useFakeTimers();

// Мокируем localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
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

describe('ChangePassword Component', () => {
  beforeEach(() => {
    // Очищаем моки и localStorage перед каждым тестом
    jest.clearAllMocks();
    mockNavigate.mockClear();
    localStorage.clear();
    
    // Имитируем аутентифицированного пользователя
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));
  });

  test('renders change password form correctly', () => {
    renderWithProviders(<ChangePassword />);
    
    // Проверяем наличие заголовка и полей формы
    expect(screen.getByText('Смена пароля')).toBeInTheDocument();
    expect(screen.getByLabelText('Текущий пароль')).toBeInTheDocument();
    expect(screen.getByLabelText('Новый пароль')).toBeInTheDocument();
    expect(screen.getByLabelText('Подтверждение пароля')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Изменить пароль' })).toBeInTheDocument();
  });

  test('validates all fields are required', async () => {
    renderWithProviders(<ChangePassword />);
    
    // Нажимаем кнопку сабмита без заполнения полей
    fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }));
    
    // Проверяем сообщение об ошибке
    expect(screen.getByText('Пожалуйста, заполните все поля')).toBeInTheDocument();
  });

  test('validates that new password and confirmation match', async () => {
    renderWithProviders(<ChangePassword />);
    
    // Заполняем поля с разными паролями
    fireEvent.change(screen.getByLabelText('Текущий пароль'), {
      target: { value: 'oldpassword123' }
    });
    fireEvent.change(screen.getByLabelText('Новый пароль'), {
      target: { value: 'newpassword123' }
    });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
      target: { value: 'differentpassword' }
    });
    
    // Отправляем форму
    fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }));
    
    // Проверяем сообщение об ошибке
    expect(screen.getByText('Новый пароль и подтверждение не совпадают')).toBeInTheDocument();
  });

  test('successfully changes password', async () => {
    // Настраиваем мок для успешного изменения пароля
    (authApi.changePassword as jest.Mock).mockResolvedValue({ message: 'Пароль успешно изменен' });
    
    renderWithProviders(<ChangePassword />);
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText('Текущий пароль'), {
      target: { value: 'oldpassword123' }
    });
    fireEvent.change(screen.getByLabelText('Новый пароль'), {
      target: { value: 'newpassword123' }
    });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
      target: { value: 'newpassword123' }
    });
    
    // Отправляем форму
    fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }));
    
    // Проверяем, что API был вызван с правильными параметрами
    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith('oldpassword123', 'newpassword123');
    });
    
    // Проверяем сообщение об успехе (используем act и waitFor)
    await waitFor(() => {
      expect(screen.getByText('Пароль успешно изменен')).toBeInTheDocument();
    }, { timeout: 2000 });
    
    // Пробрасываем таймеры на 3 секунды вперед
    jest.advanceTimersByTime(3000);
    
    // Проверяем редирект на главную страницу
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('handles API error', async () => {
    // Настраиваем мок для ошибки API
    (authApi.changePassword as jest.Mock).mockRejectedValue(new Error('Неверный текущий пароль'));
    
    renderWithProviders(<ChangePassword />);
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText('Текущий пароль'), {
      target: { value: 'oldpassword123' }
    });
    fireEvent.change(screen.getByLabelText('Новый пароль'), {
      target: { value: 'newpassword123' }
    });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
      target: { value: 'newpassword123' }
    });
    
    // Отправляем форму
    fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }));
    
    // Проверяем сообщение об ошибке
    await waitFor(() => {
      expect(screen.getByText('Неверный текущий пароль')).toBeInTheDocument();
    });
  });

  test('toggles password visibility when show/hide buttons are clicked', () => {
    renderWithProviders(<ChangePassword />);
    
    // Получаем поля ввода и кнопки видимости
    const oldPasswordInput = screen.getByLabelText('Текущий пароль');
    const newPasswordInput = screen.getByLabelText('Новый пароль');
    const confirmPasswordInput = screen.getByLabelText('Подтверждение пароля');
    const oldPasswordToggle = screen.getAllByText('Показать')[0];
    const newPasswordToggle = screen.getAllByText('Показать')[1];
    
    // Проверяем, что изначально пароли скрыты
    expect(oldPasswordInput).toHaveAttribute('type', 'password');
    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    
    // Нажимаем кнопку видимости старого пароля
    fireEvent.click(oldPasswordToggle);
    expect(oldPasswordInput).toHaveAttribute('type', 'text');
    
    // Нажимаем кнопку видимости нового пароля
    fireEvent.click(newPasswordToggle);
    expect(newPasswordInput).toHaveAttribute('type', 'text');
    expect(confirmPasswordInput).toHaveAttribute('type', 'text'); // Подтверждение синхронизировано с новым паролем
    
    // Нажимаем кнопку видимости старого пароля снова
    fireEvent.click(oldPasswordToggle);
    expect(oldPasswordInput).toHaveAttribute('type', 'password');
    
    // Нажимаем кнопку видимости нового пароля снова
    fireEvent.click(newPasswordToggle);
    expect(newPasswordInput).toHaveAttribute('type', 'password');
    expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  test('disables form inputs and changes button text during submission', async () => {
    // Настраиваем мок для долгого ответа API
    (authApi.changePassword as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    renderWithProviders(<ChangePassword />);
    
    // Заполняем форму
    fireEvent.change(screen.getByLabelText('Текущий пароль'), {
      target: { value: 'oldpassword123' }
    });
    fireEvent.change(screen.getByLabelText('Новый пароль'), {
      target: { value: 'newpassword123' }
    });
    fireEvent.change(screen.getByLabelText('Подтверждение пароля'), {
      target: { value: 'newpassword123' }
    });
    
    // Отправляем форму
    fireEvent.click(screen.getByRole('button', { name: 'Изменить пароль' }));
    
    // Проверяем, что кнопка отображает статус загрузки
    expect(screen.getByRole('button', { name: 'Сохранение...' })).toBeInTheDocument();
    
    // Проверяем, что поля формы заблокированы
    expect(screen.getByLabelText('Текущий пароль')).toBeDisabled();
    expect(screen.getByLabelText('Новый пароль')).toBeDisabled();
    expect(screen.getByLabelText('Подтверждение пароля')).toBeDisabled();
    
    // Пробрасываем таймеры, чтобы завершить промис
    jest.advanceTimersByTime(1000);
    
    // Проверяем, что поля формы разблокированы после завершения запроса
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Изменить пароль' })).toBeInTheDocument();
    });
  });

  test('shows success message on successful password change', async () => {
    (authApi.changePassword as jest.Mock).mockResolvedValue({ message: 'Пароль успешно изменен' });
    
    const { getByLabelText, getByText } = renderWithProviders(<ChangePassword />);
    
    // Заполняем форму
    fireEvent.change(getByLabelText('Текущий пароль'), { target: { value: 'currentPass123' } });
    fireEvent.change(getByLabelText('Новый пароль'), { target: { value: 'newPass456' } });
    fireEvent.change(getByLabelText('Подтверждение пароля'), { target: { value: 'newPass456' } });
    
    // Отправляем форму
    fireEvent.click(getByText('Изменить пароль'));
    
    // Проверяем, что API вызван
    expect(authApi.changePassword).toHaveBeenCalledWith('currentPass123', 'newPass456');
    
    // Проверяем, что отображается сообщение об успехе
    await waitFor(() => {
      expect(getByText('Пароль успешно изменен')).toBeInTheDocument();
    });
  });
}); 