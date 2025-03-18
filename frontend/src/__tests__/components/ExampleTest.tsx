import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { 
  setupLocalStorageMock, 
  createTestJWT,
  setupFetchMock,
  setupFetchErrorMock
} from '../testUtils';
import { AuthProvider } from '../../context/AuthContext';

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

// Пример компонента для тестирования
const ExampleComponent: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [data, setData] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/example');
      if (!response.ok) {
        throw new Error('Ошибка при загрузке данных');
      }
      const result = await response.json();
      setData(result.data);
      // Сохраняем данные в localStorage
      localStorage.setItem('example-data', JSON.stringify(result.data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>Пример компонента</h1>
      {isLoading && <div data-testid="loading">Загрузка...</div>}
      {error && <div className="error">{error}</div>}
      {data && <div data-testid="data">{data}</div>}
      
      <button onClick={fetchData}>Загрузить данные</button>
    </div>
  );
};

// Тесты
describe('ExampleComponent', () => {
  // Настраиваем localStorage mock перед каждым тестом
  let localStorageMock: ReturnType<typeof setupLocalStorageMock>;
  
  beforeEach(() => {
    localStorageMock = setupLocalStorageMock();
    jest.clearAllMocks();
  });

  test('отображает компонент и загружает данные успешно', async () => {
    // Настраиваем мок для fetch
    const mockData = { data: 'Пример данных' };
    const cleanupFetch = setupFetchMock(mockData);
    
    // Рендерим компонент с провайдерами
    renderWithProviders(<ExampleComponent />);
    
    // Проверяем начальное состояние
    expect(screen.getByText('Пример компонента')).toBeInTheDocument();
    expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('data')).not.toBeInTheDocument();
    
    // Кликаем по кнопке загрузки данных
    await act(async () => {
      fireEvent.click(screen.getByText('Загрузить данные'));
    });
    
    // Проверяем, что данные загружены и отображены
    expect(await screen.findByTestId('data')).toBeInTheDocument();
    expect(screen.getByTestId('data')).toHaveTextContent('Пример данных');
    
    // Проверяем, что данные сохранены в localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'example-data', 
      JSON.stringify('Пример данных')
    );
    
    // Очищаем мок fetch
    cleanupFetch();
  });

  test('обрабатывает ошибку при загрузке данных', async () => {
    // Настраиваем мок для fetch с ошибкой
    const cleanupFetch = setupFetchErrorMock(500, 'Ошибка сервера');
    
    // Рендерим компонент с провайдерами
    renderWithProviders(<ExampleComponent />);
    
    // Кликаем по кнопке загрузки данных
    await act(async () => {
      fireEvent.click(screen.getByText('Загрузить данные'));
    });
    
    // Проверяем, что отображается ошибка
    expect(screen.getByText('Ошибка при загрузке данных')).toBeInTheDocument();
    
    // Проверяем, что localStorage не вызывался
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    
    // Очищаем мок fetch
    cleanupFetch();
  });
}); 