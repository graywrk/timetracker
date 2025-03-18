/**
 * Общие утилиты для тестирования
 * @jest-environment node
 */

/**
 * Создает моки для localStorage
 * @returns объект с моками для localStorage
 */
export const createLocalStorageMock = () => {
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
};

/**
 * Устанавливает моки для localStorage
 * @returns объект с моками для localStorage
 */
export const setupLocalStorageMock = () => {
  const mock = createLocalStorageMock();
  
  Object.defineProperty(window, 'localStorage', {
    value: mock,
    writable: true
  });
  
  return mock;
};

/**
 * Создает мок для fetch API с успешным ответом
 * @param mockResponse ответ, который должен вернуть fetch
 * @returns функция для очистки мока
 */
export const setupFetchMock = (mockResponse: any) => {
  const originalFetch = global.fetch;
  
  // Мокируем функцию fetch
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse)
    } as Response)
  );
  
  // Возвращаем функцию очистки
  return () => {
    global.fetch = originalFetch;
  };
};

/**
 * Создает мок для fetch API с ошибкой
 * @param status HTTP статус ошибки
 * @param message сообщение об ошибке
 * @returns функция для очистки мока
 */
export const setupFetchErrorMock = (status = 400, message = 'Ошибка запроса') => {
  const originalFetch = global.fetch;
  
  // Мокируем функцию fetch с ошибкой
  global.fetch = jest.fn(() => 
    Promise.resolve({
      ok: false,
      status,
      statusText: message,
      json: () => Promise.resolve({ error: message })
    } as Response)
  );
  
  // Возвращаем функцию очистки
  return () => {
    global.fetch = originalFetch;
  };
};

/**
 * Создает JWT токен для тестов
 * @returns JWT токен
 */
export const createTestJWT = () => {
  return "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJleHAiOjE3NDIyMTQ3OTJ9.test_signature";
};

/**
 * Мок для API реакции на ошибки - создает промис, который отклоняется с заданным сообщением
 * @param message сообщение об ошибке
 * @returns отклоненный промис с ошибкой
 */
export const mockApiError = (message: string) => {
  return Promise.reject(new Error(message));
};

/**
 * Помощник для ожидания состояния загрузки
 */
export const waitForLoadingToComplete = async (
  queryByTextFn: (text: string | RegExp) => HTMLElement | null
) => {
  const loadingElement = queryByTextFn(/загрузка|loading/i);
  if (loadingElement) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
};

/**
 * Общие утилиты для тестирования
 * @jest-environment jsdom
 * @jest-file-ignore
 */

// Добавляем пустой тест, чтобы Jest не жаловался на отсутствие тестов
describe('TestUtils', () => {
  it('должен быть загружен как утилитный файл', () => {
    // Пустой тест, нужен только для предотвращения ошибки Jest
    expect(true).toBe(true);
  });
}); 