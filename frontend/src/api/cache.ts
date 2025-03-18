/**
 * Интерфейс элемента кеша
 */
interface CacheItem<T> {
  data: T;
  expiry: number | null; // null означает бессрочное хранение
}

/**
 * Класс для кеширования данных в памяти браузера
 */
export class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  
  /**
   * Получает данные из кеша по ключу
   * @param key Ключ кеша
   * @returns Данные или null, если данных нет или они просрочены
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Проверяем, не просрочен ли кеш
    if (item.expiry !== null && Date.now() > item.expiry) {
      this.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  /**
   * Сохраняет данные в кеш
   * @param key Ключ кеша
   * @param data Данные для хранения
   * @param ttlMs Время жизни кеша в миллисекундах (по умолчанию 5 минут)
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    const expiry = ttlMs ? Date.now() + ttlMs : null;
    this.cache.set(key, { data, expiry });
  }
  
  /**
   * Удаляет элемент из кеша
   * @param key Ключ кеша
   * @returns true, если элемент был удален
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * Проверяет наличие актуальных данных в кеше
   * @param key Ключ кеша
   * @returns true, если элемент существует и не просрочен
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    if (item.expiry !== null && Date.now() > item.expiry) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Очищает весь кеш или кеш по части ключа
   * @param keyPattern Опциональный паттерн для удаления определенных ключей
   */
  clear(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }
    
    // Удаляем элементы, соответствующие паттерну
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(keyPattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Константы для TTL (время жизни) разных типов данных
export const CACHE_TTL = {
  CATEGORIES: 5 * 60 * 1000, // 5 минут для категорий
  STATISTICS: 15 * 60 * 1000, // 15 минут для статистики
  USER_PROFILE: 30 * 60 * 1000, // 30 минут для профиля пользователя
};

// Создаем глобальный экземпляр кеша
export const memoryCache = new MemoryCache(); 