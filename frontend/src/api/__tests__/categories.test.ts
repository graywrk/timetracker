import { API_BASE_URL } from '../config';
import { 
  getCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory,
  Category
} from '../timetracker';

// Мокаем fetch
global.fetch = jest.fn();

const mockFetch = (fetch as jest.Mock);

describe('Тесты API категорий', () => {
  const mockToken = 'test-token';
  const mockResponse = (status: number, data: any) => {
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
      text: () => Promise.resolve(JSON.stringify(data))
    });
  };

  beforeEach(() => {
    // Сохраняем оригинальную имплементацию localStorage
    Storage.prototype.getItem = jest.fn(() => mockToken);
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Восстанавливаем оригинальную имплементацию
    jest.resetAllMocks();
  });

  describe('getCategories', () => {
    it('должен получать список категорий', async () => {
      const mockCategories = [
        { id: 1, name: 'Работа', color: '#FF0000', user_id: 1 },
        { id: 2, name: 'Учеба', color: '#00FF00', user_id: 1 }
      ];

      mockFetch.mockResolvedValueOnce(mockResponse(200, mockCategories));

      const result = await getCategories();

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/categories`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(result).toEqual(mockCategories);
    });

    it('должен обрабатывать ошибку при получении категорий', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500, { message: 'Ошибка сервера' }));

      await expect(getCategories()).rejects.toThrow();
    });

    it('должен перенаправлять на страницу входа при отсутствии токена', async () => {
      Storage.prototype.getItem = jest.fn(() => null);
      
      // Мокаем window.location.href
      const originalLocation = window.location;
      const mockLocation = { href: '' } as Location;
      Object.defineProperty(window, 'location', {
        writable: true,
        value: mockLocation
      });

      try {
        await getCategories();
      } catch (error) {
        // Ожидаемая ошибка
      }

      expect(window.location.href).toBe('/login');

      // Восстанавливаем оригинальное location
      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation
      });
    });
  });

  describe('createCategory', () => {
    it('должен создавать новую категорию', async () => {
      const newCategory = { id: 1, name: 'Новая категория', color: '#FF0000', user_id: 1 };
      
      mockFetch.mockResolvedValueOnce(mockResponse(201, newCategory));

      const result = await createCategory('Новая категория', '#FF0000');

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/categories/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Новая категория', color: '#FF0000' })
      });

      expect(result).toEqual(newCategory);
    });

    it('должен обрабатывать ошибки при создании категории', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500, { message: 'Не удалось создать категорию' }));

      await expect(createCategory('Тест', '#000000')).rejects.toThrow();
    });
  });

  describe('updateCategory', () => {
    it('должен обновлять существующую категорию', async () => {
      const updatedCategory = { id: 1, name: 'Обновленная категория', color: '#00FF00', user_id: 1 };
      
      mockFetch.mockResolvedValueOnce(mockResponse(200, updatedCategory));

      const result = await updateCategory(1, 'Обновленная категория', '#00FF00');

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/categories/update`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: 1, name: 'Обновленная категория', color: '#00FF00' })
      });

      expect(result).toEqual(updatedCategory);
    });

    it('должен обрабатывать ошибки при обновлении категории', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500, { message: 'Не удалось обновить категорию' }));

      await expect(updateCategory(1, 'Тест', '#000000')).rejects.toThrow();
    });
  });

  describe('deleteCategory', () => {
    it('должен удалять категорию', async () => {
      const successResponse = { message: 'Категория успешно удалена' };
      
      mockFetch.mockResolvedValueOnce(mockResponse(200, successResponse));

      const result = await deleteCategory(1);

      expect(fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/categories/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: 1 })
      });

      expect(result).toEqual(successResponse);
    });

    it('должен обрабатывать ошибки при удалении категории', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse(500, { message: 'Не удалось удалить категорию' }));

      await expect(deleteCategory(1)).rejects.toThrow();
    });
  });
}); 