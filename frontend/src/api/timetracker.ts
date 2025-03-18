import { API_BASE_URL } from './config';
import { memoryCache, CACHE_TTL } from './cache';

export interface Category {
  id: number;
  name: string;
  color: string;
  user_id: number;
}

export interface TimeEntry {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'paused' | 'completed';
  total_paused: number;
  category_id?: number;
  category?: Category;
}

// Типы ошибок API
export interface ApiError {
  status: number;
  message: string;
}

// Тип для событий авторизации
type AuthEventListener = () => void;

/**
 * Класс для работы с авторизацией
 */
class AuthManager {
  private authListeners: AuthEventListener[] = [];

  /**
   * Получает токен авторизации из localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Проверяет, авторизован ли пользователь
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Выход из системы
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Очищаем все кеши при выходе из системы
    memoryCache.clear();
    this.notifyAuthChange();
  }

  /**
   * Добавляет слушателя событий авторизации
   */
  addAuthListener(listener: AuthEventListener): void {
    this.authListeners.push(listener);
  }

  /**
   * Удаляет слушателя событий авторизации
   */
  removeAuthListener(listener: AuthEventListener): void {
    this.authListeners = this.authListeners.filter(l => l !== listener);
  }

  /**
   * Уведомляет о изменении состояния авторизации
   */
  private notifyAuthChange(): void {
    this.authListeners.forEach(listener => listener());
  }

  /**
   * Обрабатывает ошибку авторизации
   */
  handleAuthError(): void {
    this.logout();
    // Перенаправляем программно вместо прямого изменения location
    window.dispatchEvent(new CustomEvent('auth:required'));
  }
}

// Создаем экземпляр менеджера авторизации
const authManager = new AuthManager();

// Добавляем слушателя для перенаправления при необходимости входа
window.addEventListener('auth:required', () => {
  window.location.href = '/login';
});

/**
 * Опции для выполнения API-запроса
 */
interface FetchOptions {
  useCache?: boolean;  // Использовать ли кеш
  cacheTtl?: number;   // Время жизни кеша в мс
  forceRefresh?: boolean; // Принудительно обновить кеш
}

/**
 * Базовый HTTP-клиент для API-запросов
 */
class ApiClient {
  private baseUrl: string;
  private authManager: AuthManager;

  constructor(baseUrl: string, authManager: AuthManager) {
    this.baseUrl = baseUrl;
    this.authManager = authManager;
  }

  /**
   * Генерирует ключ кеша на основе URL и параметров запроса
   */
  private generateCacheKey(endpoint: string, method: string, body?: object): string {
    const bodyKey = body ? JSON.stringify(body) : '';
    return `${method}:${endpoint}:${bodyKey}`;
  }

  /**
   * Выполняет HTTP-запрос с авторизацией и кешированием
   */
  async fetch<T>(
    endpoint: string, 
    method: string = 'GET', 
    body?: object,
    options: FetchOptions = {}
  ): Promise<T> {
    const { useCache = false, cacheTtl, forceRefresh = false } = options;
    const cacheKey = this.generateCacheKey(endpoint, method, body);
    
    // Проверяем кеш, если разрешено использование кеша и метод GET
    if (useCache && method === 'GET' && !forceRefresh) {
      const cachedData = memoryCache.get<T>(cacheKey);
      if (cachedData) {
        console.log(`[Cache] Using cached data for ${endpoint}`);
        return cachedData;
      }
    }
    
    const token = this.authManager.getToken();
    
    if (!token) {
      this.authManager.handleAuthError();
      throw new Error('Пользователь не авторизован');
    }
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const config: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    };
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      // Обрабатываем ошибки авторизации
      if (response.status === 401 || response.status === 403) {
        console.error('Ошибка авторизации:', response.status);
        this.authManager.handleAuthError();
        throw new Error('Сессия истекла. Пожалуйста, войдите снова');
      }
      
      // Обрабатываем API-ошибки
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage: string;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Ошибка API: ${response.status}`;
        } catch {
          errorMessage = errorText || `Ошибка API: ${response.status}`;
        }
        
        console.error('Ошибка API:', response.status, errorText);
        throw new Error(errorMessage);
      }
      
      // Особая обработка для 404 в определенных случаях
      if (response.status === 404) {
        return null as unknown as T;
      }
      
      // Парсим JSON
      const data = await response.json();
      
      // Кешируем результат, если это GET-запрос и кеширование разрешено
      if (useCache && method === 'GET') {
        console.log(`[Cache] Caching data for ${endpoint}`);
        memoryCache.set(cacheKey, data, cacheTtl);
      }
      
      return data;
    } catch (error) {
      console.error('Ошибка запроса:', error);
      throw error;
    }
  }
  
  /**
   * Сбрасывает кеш для определенного эндпоинта
   */
  invalidateCache(endpoint: string): void {
    memoryCache.clear(endpoint);
    console.log(`[Cache] Invalidated cache for ${endpoint}`);
  }
}

// Создаем экземпляр API-клиента
const apiClient = new ApiClient(API_BASE_URL, authManager);

/**
 * API для работы с записями времени
 */
export class TimeEntryApi {
  /**
   * Получает активную запись времени пользователя
   * @param options Опции запроса
   * @returns Активная запись времени или null, если нет активной записи
   */
  static async getActiveTimeEntry(options: FetchOptions = { useCache: true, cacheTtl: 30000 }): Promise<TimeEntry | null> {
    try {
      const response = await apiClient.fetch<TimeEntry | { status: string }>(
        '/api/time/status', 
        'GET', 
        undefined, 
        options
      );
      
      // Если сервер возвращает статус 'no_active_entry', значит активной записи нет
      if (response && 'status' in response && response.status === 'no_active_entry') {
        console.log('Нет активной записи времени (по статусу)');
        return null;
      }
      
      return response as TimeEntry;
    } catch (error) {
      console.error('Ошибка при запросе статуса времени:', error);
      throw error;
    }
  }

  /**
   * Начинает новую запись времени
   * @param categoryId Опциональный ID категории
   * @returns Созданная запись времени
   */
  static async startTimeEntry(categoryId?: number): Promise<TimeEntry> {
    const body = categoryId ? { category_id: categoryId } : undefined;
    const result = await apiClient.fetch<TimeEntry>('/api/time/start', 'POST', body);
    
    // Инвалидируем кеш статуса после изменения
    apiClient.invalidateCache('/api/time/status');
    
    return result;
  }

  /**
   * Ставит запись времени на паузу
   * @param entryId ID записи времени
   * @returns Обновленная запись времени
   */
  static async pauseTimeEntry(entryId: number): Promise<TimeEntry> {
    const result = await apiClient.fetch<TimeEntry>('/api/time/pause', 'POST', { entry_id: entryId });
    
    // Инвалидируем кеш статуса после изменения
    apiClient.invalidateCache('/api/time/status');
    
    return result;
  }

  /**
   * Возобновляет запись времени после паузы
   * @param entryId ID записи времени
   * @returns Обновленная запись времени
   */
  static async resumeTimeEntry(entryId: number): Promise<TimeEntry> {
    const result = await apiClient.fetch<TimeEntry>('/api/time/resume', 'POST', { entry_id: entryId });
    
    // Инвалидируем кеш статуса после изменения
    apiClient.invalidateCache('/api/time/status');
    
    return result;
  }

  /**
   * Завершает запись времени
   * @param entryId ID записи времени
   * @returns Обновленная запись времени
   */
  static async stopTimeEntry(entryId: number): Promise<TimeEntry> {
    const result = await apiClient.fetch<TimeEntry>('/api/time/stop', 'POST', { entry_id: entryId });
    
    // Инвалидируем кеш статуса после изменения
    apiClient.invalidateCache('/api/time/status');
    
    return result;
  }

  /**
   * Удаляет запись времени
   * @param entryId ID записи времени
   * @returns Сообщение об успешном удалении
   */
  static async deleteTimeEntry(entryId: number): Promise<{ message: string }> {
    const result = await apiClient.fetch<{ message: string }>('/api/time/delete', 'POST', { entry_id: entryId });
    
    // Инвалидируем кеш статуса после изменения
    apiClient.invalidateCache('/api/time/status');
    
    return result;
  }
}

/**
 * API для работы с категориями
 */
export class CategoryApi {
  /**
   * Получает список всех категорий пользователя
   * @param options Опции запроса
   * @returns Список категорий
   */
  static async getCategories(options: FetchOptions = { useCache: true, cacheTtl: CACHE_TTL.CATEGORIES }): Promise<Category[]> {
    try {
      const data = await apiClient.fetch<Category[]>('/api/categories', 'GET', undefined, options);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Ошибка при получении категорий:", error);
      return [];
    }
  }

  /**
   * Создает новую категорию
   * @param name Название категории
   * @param color Цвет категории в hex формате (например, #FF5733)
   * @returns Созданная категория
   */
  static async createCategory(name: string, color: string): Promise<Category> {
    const result = await apiClient.fetch<Category>('/api/categories/create', 'POST', { name, color });
    
    // Инвалидируем кеш категорий после изменения
    apiClient.invalidateCache('/api/categories');
    
    return result;
  }

  /**
   * Обновляет существующую категорию
   * @param id ID категории
   * @param name Новое название категории
   * @param color Новый цвет категории
   * @returns Обновленная категория
   */
  static async updateCategory(id: number, name: string, color: string): Promise<Category> {
    const result = await apiClient.fetch<Category>('/api/categories/update', 'POST', { id, name, color });
    
    // Инвалидируем кеш категорий после изменения
    apiClient.invalidateCache('/api/categories');
    
    return result;
  }

  /**
   * Удаляет категорию
   * @param id ID категории
   * @returns Сообщение об успешном удалении
   */
  static async deleteCategory(id: number): Promise<{ message: string }> {
    const result = await apiClient.fetch<{ message: string }>('/api/categories/delete', 'POST', { id });
    
    // Инвалидируем кеш категорий после изменения
    apiClient.invalidateCache('/api/categories');
    
    return result;
  }
}

// Экспортируем старые функции для обратной совместимости
// В будущем их можно пометить как устаревшие (@deprecated)

export const getActiveTimeEntry = TimeEntryApi.getActiveTimeEntry;
export const startTimeEntry = TimeEntryApi.startTimeEntry.bind(null, undefined);
export const pauseTimeEntry = TimeEntryApi.pauseTimeEntry;
export const resumeTimeEntry = TimeEntryApi.resumeTimeEntry;
export const stopTimeEntry = TimeEntryApi.stopTimeEntry;
export const deleteTimeEntry = TimeEntryApi.deleteTimeEntry;
export const getCategories = CategoryApi.getCategories;
export const createCategory = CategoryApi.createCategory;
export const updateCategory = CategoryApi.updateCategory;
export const deleteCategory = CategoryApi.deleteCategory;
export const startTimeEntryWithCategory = TimeEntryApi.startTimeEntry; 