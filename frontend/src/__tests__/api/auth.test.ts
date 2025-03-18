import { login, register, logout, getCurrentUser, changePassword } from '../../api/auth';
import { API_BASE_URL } from '../../api/config';

// Мокаем fetch API
global.fetch = jest.fn();

// Мокаем localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Auth API', () => {
  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  test('login успешно авторизует пользователя и сохраняет данные в localStorage', async () => {
    // Создаем мок-ответ для fetch
    const mockResponse = {
      token: 'test_token',
      user: {
        id: 1,
        email: 'test@example.com'
      }
    };

    // Настраиваем мок fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    // Вызываем функцию login
    const result = await login('test@example.com', 'password123');

    // Проверяем, что fetch был вызван с правильными параметрами
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      })
    );

    // Проверяем, что функция вернула ожидаемый результат
    expect(result).toEqual(mockResponse);

    // Проверяем, что данные были сохранены в localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test_token');
    expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.user));
  });

  test('login выбрасывает ошибку при неуспешной авторизации', async () => {
    // Настраиваем мок fetch для имитации ошибки
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ message: 'Неверный логин или пароль' })
    });

    // Ожидаем, что функция выбросит ошибку
    await expect(login('wrong@example.com', 'wrong_password')).rejects.toThrow();

    // Проверяем, что fetch был вызван
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Проверяем, что в localStorage ничего не было сохранено
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  test('register успешно регистрирует пользователя и сохраняет данные в localStorage', async () => {
    // Создаем мок-ответ для fetch
    const mockResponse = {
      token: 'test_token',
      user: {
        id: 1,
        email: 'new@example.com'
      }
    };

    // Настраиваем мок fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    // Вызываем функцию register
    const result = await register('new@example.com', 'new_password', 'New User');

    // Проверяем, что fetch был вызван с правильными параметрами
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/register'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ 
          email: 'new@example.com', 
          password: 'new_password',
          name: 'New User'
        })
      })
    );

    // Проверяем, что функция вернула ожидаемый результат
    expect(result).toEqual(mockResponse);

    // Проверяем, что данные были сохранены в localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test_token');
    expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockResponse.user));
  });

  test('logout удаляет данные пользователя из localStorage', () => {
    // Предварительно сохраняем данные в localStorage
    localStorage.setItem('token', 'test_token');
    localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com' }));

    // Очищаем историю вызовов, чтобы проверить только вызовы из logout
    jest.clearAllMocks();

    // Вызываем функцию logout
    logout();

    // Проверяем, что данные были удалены из localStorage
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
  });

  test('getCurrentUser возвращает данные пользователя из localStorage', () => {
    // Создаем мок-данные пользователя
    const mockUser = { id: 1, email: 'test@example.com' };

    // Мокаем localStorage.getItem для возврата данных пользователя
    (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(mockUser));

    // Вызываем функцию getCurrentUser
    const result = getCurrentUser();

    // Проверяем, что функция вернула ожидаемого пользователя
    expect(result).toEqual(mockUser);

    // Проверяем, что localStorage.getItem был вызван с правильным ключом
    expect(localStorage.getItem).toHaveBeenCalledWith('user');
  });

  test('getCurrentUser возвращает null, если пользователь не авторизован', () => {
    // Мокаем localStorage.getItem для имитации отсутствия данных
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    // Вызываем функцию getCurrentUser
    const result = getCurrentUser();

    // Проверяем, что функция вернула null
    expect(result).toBeNull();

    // Проверяем, что localStorage.getItem был вызван с правильным ключом
    expect(localStorage.getItem).toHaveBeenCalledWith('user');
  });

  test('changePassword успешно обновляет пароль пользователя', async () => {
    // Мокаем наличие токена в localStorage
    (localStorage.getItem as jest.Mock).mockReturnValue('test_token');

    // Создаем мок-ответ для fetch
    const mockResponse = { message: 'Пароль успешно изменен' };

    // Настраиваем мок fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    // Вызываем функцию changePassword
    const result = await changePassword('old_password', 'new_password');

    // Проверяем, что fetch был вызван с правильными параметрами
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/change-password'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test_token'
        }),
        body: JSON.stringify({
          old_password: 'old_password',
          new_password: 'new_password'
        })
      })
    );

    // Проверяем, что функция вернула ожидаемый результат
    expect(result).toEqual(mockResponse);
  });

  test('changePassword выбрасывает ошибку, если пользователь не авторизован', async () => {
    // Мокаем отсутствие токена в localStorage
    (localStorage.getItem as jest.Mock).mockReturnValue(null);

    // Ожидаем, что функция выбросит ошибку
    await expect(changePassword('old_password', 'new_password')).rejects.toThrow('Вы не авторизованы');

    // Проверяем, что fetch не был вызван
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('changePassword выбрасывает ошибку при неуспешном обновлении пароля', async () => {
    // Мокаем наличие токена в localStorage
    (localStorage.getItem as jest.Mock).mockReturnValue('test_token');

    // Настраиваем мок fetch для имитации ошибки
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Неверный текущий пароль' })
    });

    // Ожидаем, что функция выбросит ошибку
    await expect(changePassword('wrong_old_password', 'new_password')).rejects.toThrow();

    // Проверяем, что fetch был вызван
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
}); 