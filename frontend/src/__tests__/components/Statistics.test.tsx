import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Statistics from '../../components/Statistics';
import { AuthProvider } from '../../context/AuthContext';
import * as statisticsApi from '../../api/statistics';
import * as timetrackerApi from '../../api/timetracker';

// Мокаем API функции
jest.mock('../../api/statistics', () => ({
  getUserStats: jest.fn()
}));

jest.mock('../../api/timetracker', () => ({
  deleteTimeEntry: jest.fn()
}));

// Мокаем localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {
    token: 'fake-token',
    user: JSON.stringify({ id: 1, email: 'test@example.com' })
  };
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Сохраняем оригинальный window.confirm
const originalConfirm = window.confirm;

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

describe('Statistics Component', () => {
  const mockStats = {
    total_duration: 3600, // 1 час
    average_daily_hours: 1, // 1 час в день
    longest_session: 3600, // 1 час
    longest_session_date: '2023-01-01T00:00:00Z',
    daily_stats: {
      '2023-01-01': 3600 // 1 час
    },
    entries: [
      {
        id: 1,
        user_id: 1,
        start_time: '2023-01-01T13:00:00Z',
        end_time: '2023-01-01T14:00:00Z',
        status: 'completed',
        total_paused: 0
      }
    ]
  };

  beforeEach(() => {
    // Очищаем моки и localStorage перед каждым тестом
    jest.clearAllMocks();
    
    // Устанавливаем значение по умолчанию для API статистики
    (statisticsApi.getUserStats as jest.Mock).mockResolvedValue(mockStats);
    
    // Мокируем window.confirm для всех тестов
    window.confirm = jest.fn().mockImplementation(() => true);
  });

  afterEach(() => {
    // Восстанавливаем оригинальный window.confirm после каждого теста
    window.confirm = originalConfirm;
  });

  test('renders statistics component and loads data', async () => {
    // Задерживаем ответ API, чтобы увидеть состояние загрузки
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    (statisticsApi.getUserStats as jest.Mock).mockImplementationOnce(() => promise);
    
    renderWithProviders(<Statistics />);
    
    // Проверяем загрузку компонента
    expect(screen.getByText('Загрузка данных...')).toBeInTheDocument();
    
    // Разрешаем промис с данными
    await act(async () => {
      resolvePromise!(mockStats);
    });
    
    // Проверяем, что API вызван для загрузки статистики
    await waitFor(() => {
      expect(statisticsApi.getUserStats).toHaveBeenCalled();
    });
    
    // Проверяем наличие статистических карточек
    await waitFor(() => {
      expect(screen.getByText('Общая продолжительность')).toBeInTheDocument();
      expect(screen.getByText('Среднее время в день')).toBeInTheDocument();
      expect(screen.getByText('Самая длинная сессия')).toBeInTheDocument();
    });
    
    // Проверяем наличие значений статистики
    expect(screen.getAllByText('1 ч 0 мин')[0]).toBeInTheDocument();
    
    // Проверяем таблицу ежедневной статистики
    expect(screen.getByText('Ежедневная статистика')).toBeInTheDocument();
    
    // Проверяем таблицу записей
    expect(screen.getByText('Последние записи')).toBeInTheDocument();
    expect(screen.getByText('Удалить')).toBeInTheDocument();
  });

  test('allows changing date range and updating statistics', async () => {
    const newMockStats = {
      ...mockStats,
      total_duration: 7200, // 2 часа
      average_daily_hours: 2 // 2 часа в день
    };
    
    (statisticsApi.getUserStats as jest.Mock)
      .mockResolvedValueOnce(mockStats) // Первый вызов - исходные данные
      .mockResolvedValueOnce(newMockStats); // Второй вызов - обновленные данные
    
    await act(async () => {
      renderWithProviders(<Statistics />);
    });
    
    // Ждем загрузки данных
    await waitFor(() => {
      expect(screen.getByText('Общая продолжительность')).toBeInTheDocument();
    });
    
    // Изменяем даты
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Начальная дата'), {
        target: { value: '2023-01-01' }
      });
      
      fireEvent.change(screen.getByLabelText('Конечная дата'), {
        target: { value: '2023-01-31' }
      });
      
      // Нажимаем кнопку обновления
      fireEvent.click(screen.getByText('Обновить'));
    });
    
    // Проверяем, что API вызван с новыми датами
    await waitFor(() => {
      expect(statisticsApi.getUserStats).toHaveBeenCalledWith('2023-01-01', '2023-01-31');
    });
    
    // Проверяем, что отображаются новые данные
    await waitFor(() => {
      expect(screen.getAllByText('2 ч 0 мин')[0]).toBeInTheDocument();
    });
  });

  test('handles the deletion of a time entry', async () => {
    // Мокируем ответ API на удаление
    (timetrackerApi.deleteTimeEntry as jest.Mock).mockResolvedValue({ message: 'Запись успешно удалена' });
    
    // Мокируем window.confirm
    window.confirm = jest.fn().mockImplementation(() => true);
    
    await act(async () => {
      renderWithProviders(<Statistics />);
    });
    
    // Ждем загрузки данных
    await waitFor(() => {
      expect(screen.getByText('Удалить')).toBeInTheDocument();
    });
    
    // Нажимаем кнопку удаления
    await act(async () => {
      fireEvent.click(screen.getByText('Удалить'));
    });
    
    // Проверяем, что было показано подтверждение
    expect(window.confirm).toHaveBeenCalled();
    
    // Проверяем, что API вызван для удаления записи
    await waitFor(() => {
      expect(timetrackerApi.deleteTimeEntry).toHaveBeenCalledWith(1);
    });
    
    // Проверяем, что после удаления API вызван для обновления статистики
    await waitFor(() => {
      expect(statisticsApi.getUserStats).toHaveBeenCalledTimes(2);
    });
    
    // Проверяем сообщение об успешном удалении
    await waitFor(() => {
      expect(screen.getByText('Запись успешно удалена')).toBeInTheDocument();
    });
  });

  test('handles cancellation of entry deletion', async () => {
    // Мокируем window.confirm чтобы вернуть false (отмена)
    window.confirm = jest.fn().mockImplementation(() => false);
    
    await act(async () => {
      renderWithProviders(<Statistics />);
    });
    
    // Ждем загрузки данных
    await waitFor(() => {
      expect(screen.getByText('Удалить')).toBeInTheDocument();
    });
    
    // Нажимаем кнопку удаления
    await act(async () => {
      fireEvent.click(screen.getByText('Удалить'));
    });
    
    // Проверяем, что было показано подтверждение
    expect(window.confirm).toHaveBeenCalled();
    
    // Проверяем, что API НЕ вызван для удаления записи
    expect(timetrackerApi.deleteTimeEntry).not.toHaveBeenCalled();
  });

  test('shows error message when statistics cannot be loaded', async () => {
    // Создаем задержанный ответ API, который затем вызовет ошибку
    let rejectPromise: (reason: Error) => void;
    const promise = new Promise<any>((_, reject) => {
      rejectPromise = reject;
    });
    
    // Мокируем ошибку API
    (statisticsApi.getUserStats as jest.Mock).mockImplementation(() => promise);
    
    renderWithProviders(<Statistics />);
    
    // Проверяем, что сначала показывается индикатор загрузки
    expect(screen.getByText('Загрузка данных...')).toBeInTheDocument();
    
    // Вызываем отклонение промиса с ошибкой
    await act(async () => {
      rejectPromise!(new Error('Ошибка сервера'));
    });
    
    // Проверяем сообщение об ошибке
    await waitFor(() => {
      expect(screen.getByText('Не удалось загрузить статистику')).toBeInTheDocument();
    });
    
    // Проверяем, что индикатор загрузки скрылся
    expect(screen.queryByText('Загрузка данных...')).not.toBeInTheDocument();
  });

  test('shows error message when deleting a time entry fails', async () => {
    // Сначала мокируем успешную загрузку статистики
    (statisticsApi.getUserStats as jest.Mock).mockResolvedValue(mockStats);
    
    // Затем мокируем ошибку при удалении записи
    (timetrackerApi.deleteTimeEntry as jest.Mock).mockRejectedValue(new Error('Ошибка при удалении'));
    
    // Мокируем window.confirm, чтобы возвращать true
    window.confirm = jest.fn().mockImplementation(() => true);
    
    await act(async () => {
      renderWithProviders(<Statistics />);
    });
    
    // Ждем загрузки данных и отображения кнопки удаления
    await waitFor(() => {
      expect(screen.getByText('Удалить')).toBeInTheDocument();
    });
    
    // Нажимаем кнопку удаления
    await act(async () => {
      fireEvent.click(screen.getByText('Удалить'));
    });
    
    // Проверяем, что window.confirm был вызван
    expect(window.confirm).toHaveBeenCalled();
    
    // Проверяем, что API вызван для удаления записи
    expect(timetrackerApi.deleteTimeEntry).toHaveBeenCalledWith(1);
    
    // Проверяем сообщение об ошибке
    await waitFor(() => {
      expect(screen.getByText('Ошибка при удалении записи: Ошибка при удалении')).toBeInTheDocument();
    });
  });
}); 