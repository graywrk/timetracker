import { MemoryCache } from '../cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('должен сохранять и возвращать данные', () => {
    const testData = { id: 1, name: 'Test' };
    cache.set('test-key', testData);
    
    expect(cache.get('test-key')).toEqual(testData);
  });

  test('должен возвращать null для отсутствующего ключа', () => {
    expect(cache.get('non-existent-key')).toBeNull();
  });

  test('должен правильно проверять наличие данных', () => {
    cache.set('test-key', { data: 'value' });
    
    expect(cache.has('test-key')).toBe(true);
    expect(cache.has('non-existent-key')).toBe(false);
  });

  test('должен удалять данные по ключу', () => {
    cache.set('test-key', { data: 'value' });
    expect(cache.has('test-key')).toBe(true);
    
    cache.delete('test-key');
    expect(cache.has('test-key')).toBe(false);
    expect(cache.get('test-key')).toBeNull();
  });

  test('должен очищать весь кеш', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    cache.clear();
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  test('должен очищать кеш по паттерну', () => {
    cache.set('users:1', { id: 1, name: 'User 1' });
    cache.set('users:2', { id: 2, name: 'User 2' });
    cache.set('categories:1', { id: 1, name: 'Category 1' });
    
    cache.clear('users');
    
    expect(cache.get('users:1')).toBeNull();
    expect(cache.get('users:2')).toBeNull();
    expect(cache.get('categories:1')).not.toBeNull();
  });

  test('должен учитывать время жизни кеша', () => {
    const testData = { id: 1, name: 'Test' };
    cache.set('test-key', testData, 1000); // 1 секунда
    
    expect(cache.get('test-key')).toEqual(testData);
    
    // Перематываем время на 1.5 секунды вперед
    jest.advanceTimersByTime(1500);
    
    expect(cache.get('test-key')).toBeNull();
    expect(cache.has('test-key')).toBe(false);
  });

  test('должен хранить данные бессрочно, если TTL не указан', () => {
    const testData = { id: 1, name: 'Test' };
    cache.set('test-key', testData); // без TTL
    
    // Перематываем время на день вперед
    jest.advanceTimersByTime(24 * 60 * 60 * 1000);
    
    expect(cache.get('test-key')).toEqual(testData);
    expect(cache.has('test-key')).toBe(true);
  });
}); 