import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

/**
 * Создает моки для localStorage
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
    }),
    initializeStore: (initialStore: Record<string, string>) => {
      store = { ...initialStore };
    }
  };
};

/**
 * Устанавливает моки для localStorage
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
 * Рендерит компонент со всеми необходимыми провайдерами
 */
export const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    React.createElement(BrowserRouter, null,
      React.createElement(AuthProvider, null, ui)
    )
  );
};

/**
 * Рендерит компонент с указанным URL маршрутом
 */
export const renderWithRoute = (ui: React.ReactElement, route = '/') => {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [route] },
      React.createElement(AuthProvider, null, ui)
    )
  );
};

/**
 * Создает мок для fetch API
 */
export const setupFetchMock = (responses: Record<string, {
  ok: boolean;
  status?: number;
  data: any;
}>) => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    const matchedUrl = Object.keys(responses).find(key => url.includes(key));
    
    if (matchedUrl) {
      const { ok, status = ok ? 200 : 400, data } = responses[matchedUrl];
      
      return Promise.resolve({
        ok,
        status,
        json: () => Promise.resolve(data)
      } as any);
    }
    
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ message: 'Not found' })
    } as any);
  });
  
  return global.fetch;
};

/**
 * Создает JWT токен для тестов
 */
export const createTestJWT = (userData = { id: 1, email: 'test@example.com' }) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    user_id: userData.id,
    exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64');
  
  return `${header}.${payload}.test_signature`;
};

/**
 * Мок для API реакции на ошибки - создает промис, который отклоняется с заданным сообщением
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
 * Устанавливает моки для действий React Router
 */
export const setupRouterMocks = () => {
  const mockNavigate = jest.fn();
  
  jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
  }));
  
  return { mockNavigate };
};



