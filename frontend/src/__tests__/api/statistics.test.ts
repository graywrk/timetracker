import { getUserStats, TimeStats } from '../../api/statistics';
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

describe('Statistics API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });
  
  const mockTimeStats: TimeStats = {
    total_duration: 3600,
    average_daily_hours: 1.5,
    longest_session: 3600,
    longest_session_date: '2023-01-01',
    daily_stats: { '2023-01-01': 3600 },
    entries: [
      {
        id: 1,
        user_id: 1,
        start_time: '2023-01-01T10:00:00Z',
        end_time: '2023-01-01T11:00:00Z',
        status: 'completed',
        total_paused: 0
      }
    ]
  };

  test('getUserStats успешно получает статистику пользователя', async () => {
    // Мокаем наличие токена в localStorage
    (localStorage.getItem as jest.Mock).mockReturnValue('test_token');
    
    // Настраиваем мок fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockTimeStats
    });
    
    // Вызываем функцию getUserStats
    const result = await getUserStats('2023-01-01', '2023-01-31');
    
    // Проверяем, что fetch был вызван с правильными параметрами
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/stats/custom?start_date=2023-01-01&end_date=2023-01-31'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test_token'
        })
      })
    );
    
    // Проверяем, что функция вернула ожидаемый результат
    expect(result).toEqual(mockTimeStats);
  });
  
  test('getUserStats обрабатывает ошибки при неуспешном запросе', async () => {
    // Мокаем наличие токена в localStorage
    (localStorage.getItem as jest.Mock).mockReturnValue('test_token');
    
    // Настраиваем мок fetch для имитации ошибки
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Ошибка сервера' })
    });
    
    // Вызываем функцию и проверяем, что она выбрасывает ошибку
    await expect(getUserStats('2023-01-01', '2023-01-31')).rejects.toThrow();
    
    // Проверяем, что fetch был вызван
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
  
  test('getUserStats выбрасывает ошибку, если пользователь не авторизован', async () => {
    // Мокаем отсутствие токена в localStorage
    (localStorage.getItem as jest.Mock).mockReturnValue(null);
    
    // Вызываем функцию и проверяем, что она выбрасывает ошибку авторизации
    await expect(getUserStats('2023-01-01', '2023-01-31')).rejects.toThrow('Пользователь не авторизован');
    
    // Проверяем, что fetch не был вызван
    expect(global.fetch).not.toHaveBeenCalled();
  });
  
  test('getUserStats преобразует строковые значения в числа', async () => {
    // Мокаем наличие токена в localStorage
    (localStorage.getItem as jest.Mock).mockReturnValue('test_token');
    
    // Создаем мок-ответ с числами в строковом формате
    const stringyResponse = {
      total_duration: '3600',
      average_daily_hours: '1.5',
      longest_session: '3600',
      longest_session_date: '2023-01-01',
      daily_stats: { '2023-01-01': '3600' },
      entries: [
        {
          id: 1,
          user_id: 1,
          start_time: '2023-01-01T10:00:00Z',
          end_time: '2023-01-01T11:00:00Z',
          status: 'completed',
          total_paused: 0
        }
      ]
    };
    
    // Настраиваем мок fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => stringyResponse
    });
    
    // Вызываем функцию getUserStats
    const result = await getUserStats('2023-01-01', '2023-01-31');
    
    // Проверяем, что числовые значения были преобразованы из строк в числа
    expect(typeof result.total_duration).toBe('number');
    expect(typeof result.average_daily_hours).toBe('number');
    expect(typeof result.longest_session).toBe('number');
    expect(typeof result.daily_stats['2023-01-01']).toBe('number');
    
    // Проверяем, что преобразованные значения корректны
    expect(result.total_duration).toBe(3600);
    expect(result.average_daily_hours).toBe(1.5);
    expect(result.longest_session).toBe(3600);
    expect(result.daily_stats['2023-01-01']).toBe(3600);
  });
}); 