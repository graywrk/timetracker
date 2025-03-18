import { deleteTimeEntry, TimeEntryApi, CategoryApi } from '../../api/timetracker';
import { API_BASE_URL } from '../../api/config';
import { memoryCache } from '../../api/cache';

// Мокаем fetch
global.fetch = jest.fn();

// Мокаем localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Мокаем window.location
const locationMock = {
  href: ''
};
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true
});

// Мокаем console.log
const originalConsoleLog = console.log;
console.log = jest.fn();

// Мокаем обработчик событий
const originalAddEventListener = window.addEventListener;
const originalDispatchEvent = window.dispatchEvent;
const mockAuthRequiredHandler = jest.fn();

// Сбрасываем все моки и настройки перед тестами
beforeAll(() => {
  // Восстанавливаем стандартное поведение addEventListener
  window.addEventListener = originalAddEventListener;
  window.dispatchEvent = originalDispatchEvent;
});

afterAll(() => {
  // Восстанавливаем console.log после всех тестов
  console.log = originalConsoleLog;
});

describe('deleteTimeEntry', () => {
  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('test-token');
    
    // Очищаем кеш
    memoryCache.clear();
    
    // Добавляем слушателя события auth:required
    window.addEventListener = jest.fn((event, handler) => {
      if (event === 'auth:required' && typeof handler === 'function') {
        mockAuthRequiredHandler.mockImplementation(handler);
      }
      return originalAddEventListener.call(window, event, handler);
    });
    
    // Восстанавливаем поведение dispatchEvent
    window.dispatchEvent = jest.fn((event) => {
      if (event.type === 'auth:required') {
        mockAuthRequiredHandler();
      }
      return originalDispatchEvent.call(window, event);
    });
  });

  afterEach(() => {
    // Восстанавливаем оригинальные методы
    window.addEventListener = originalAddEventListener;
    window.dispatchEvent = originalDispatchEvent;
  });

  it('должен успешно удалить запись времени', async () => {
    // Мокаем успешный ответ
    const mockResponse = {
      message: 'Запись успешно удалена'
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    });

    // Вызываем функцию
    const result = await deleteTimeEntry(1);

    // Проверяем, что fetch был вызван с правильными параметрами
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/time/delete`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entry_id: 1 })
    });

    // Проверяем результат
    expect(result).toEqual(mockResponse);
    
    // Проверяем, что кеш статуса был инвалидирован
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Invalidated cache for /api/time/status'));
  });

  it('должен вызвать событие auth:required, если токен отсутствует', async () => {
    // Мокаем отсутствие токена
    localStorageMock.getItem.mockReturnValueOnce(null);

    // Вызываем функцию и ожидаем ошибку
    await expect(deleteTimeEntry(1)).rejects.toThrow('Пользователь не авторизован');

    // Проверяем, что произошло событие auth:required
    expect(window.dispatchEvent).toHaveBeenCalled();
    expect(mockAuthRequiredHandler).toHaveBeenCalled();
    
    // Проверяем, что fetch не был вызван
    expect(fetch).not.toHaveBeenCalled();
  });

  it('должен обработать ошибку авторизации', async () => {
    // Мокаем ответ с ошибкой авторизации
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValueOnce('Ошибка авторизации')
    });

    // Вызываем функцию и ожидаем ошибку
    await expect(deleteTimeEntry(1)).rejects.toThrow('Сессия истекла. Пожалуйста, войдите снова');

    // Проверяем, что localStorage был очищен
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    
    // Проверяем, что произошло событие auth:required
    expect(window.dispatchEvent).toHaveBeenCalled();
    expect(mockAuthRequiredHandler).toHaveBeenCalled();
    
    // Проверяем, что кеш был очищен
    expect(memoryCache.get('any-key')).toBeNull();
  });

  it('должен обработать ошибку сервера', async () => {
    // Мокаем ответ с ошибкой сервера
    const errorMessage = 'Запись не найдена';
    const errorResponse = JSON.stringify({ message: errorMessage });
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValueOnce(errorResponse)
    });

    // Вызываем функцию и ожидаем ошибку
    await expect(deleteTimeEntry(1)).rejects.toThrow(errorMessage);
  });

  it('должен работать через статический метод TimeEntryApi', async () => {
    // Мокаем успешный ответ
    const mockResponse = {
      message: 'Запись успешно удалена'
    };
    
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    });

    // Вызываем статический метод класса
    const result = await TimeEntryApi.deleteTimeEntry(1);

    // Проверяем, что fetch был вызван с правильными параметрами
    expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/time/delete`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entry_id: 1 })
    });

    // Проверяем результат
    expect(result).toEqual(mockResponse);
  });
});

describe('Categories API с кешированием', () => {
  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('test-token');
    
    // Очищаем кеш
    memoryCache.clear();
  });

  it('должен кешировать результаты запроса категорий', async () => {
    const mockCategories = [
      { id: 1, name: 'Работа', color: '#ff0000', user_id: 1 },
      { id: 2, name: 'Учеба', color: '#00ff00', user_id: 1 }
    ];

    // Мокаем первый запрос
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockCategories)
    });

    // Первый вызов должен обратиться к API
    const result1 = await CategoryApi.getCategories();
    expect(result1).toEqual(mockCategories);
    expect(fetch).toHaveBeenCalledTimes(1);
    
    // Второй вызов должен получить данные из кеша без обращения к API
    const result2 = await CategoryApi.getCategories();
    expect(result2).toEqual(mockCategories);
    expect(fetch).toHaveBeenCalledTimes(1); // fetch не должен вызываться второй раз
    
    // Проверяем, что сообщение о использовании кеша было залогировано
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Using cached data'));
  });

  it('должен обновлять кеш при принудительном обновлении', async () => {
    const mockCategories1 = [{ id: 1, name: 'Работа', color: '#ff0000', user_id: 1 }];
    const mockCategories2 = [
      { id: 1, name: 'Работа', color: '#ff0000', user_id: 1 },
      { id: 2, name: 'Учеба', color: '#00ff00', user_id: 1 }
    ];

    // Мокаем первый и второй запросы с разными ответами
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockCategories1)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockCategories2)
      });

    // Первый вызов кеширует данные
    const result1 = await CategoryApi.getCategories();
    expect(result1).toEqual(mockCategories1);
    expect(fetch).toHaveBeenCalledTimes(1);
    
    // Второй вызов с forceRefresh должен игнорировать кеш
    const result2 = await CategoryApi.getCategories({ forceRefresh: true });
    expect(result2).toEqual(mockCategories2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('должен инвалидировать кеш при создании категории', async () => {
    const mockCategories = [{ id: 1, name: 'Работа', color: '#ff0000', user_id: 1 }];
    const newCategory = { id: 2, name: 'Учеба', color: '#00ff00', user_id: 1 };

    // Мокаем запросы
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockCategories)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(newCategory)
      });

    // Получаем и кешируем категории
    await CategoryApi.getCategories();
    
    // Добавляем новую категорию
    await CategoryApi.createCategory('Учеба', '#00ff00');
    
    // Проверяем, что кеш был инвалидирован
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Invalidated cache for /api/categories'));
  });
}); 