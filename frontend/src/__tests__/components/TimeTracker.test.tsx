import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TimeTracker from '../../components/TimeTracker/TimeTracker';
import { AuthProvider } from '../../context/AuthContext';
import * as timeTrackerApi from '../../api/timetracker';

// Мокаем API-функции
jest.mock('../../api/timetracker', () => ({
  getActiveTimeEntry: jest.fn(),
  startTimeEntry: jest.fn(),
  pauseTimeEntry: jest.fn(),
  resumeTimeEntry: jest.fn(),
  stopTimeEntry: jest.fn(),
  deleteTimeEntry: jest.fn(),
  getCategories: jest.fn().mockResolvedValue([
    { id: 1, name: 'Работа', color: '#ff0000', user_id: 1 },
    { id: 2, name: 'Обучение', color: '#00ff00', user_id: 1 }
  ])
}));

// Создаем тестовые данные
const mockActiveEntry = {
  id: 1,
  user_id: 1,
  start_time: new Date(Date.now() - 3600000).toISOString(), // Час назад
  end_time: null,
  status: 'active',
  total_paused: 0
};

const mockPausedEntry = {
  ...mockActiveEntry,
  status: 'paused',
  total_paused: 300 // 5 минут на паузе
};

const mockCompletedEntry = {
  ...mockActiveEntry,
  end_time: new Date().toISOString(),
  status: 'completed'
};

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

describe('TimeTracker Component', () => {
  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
    
    // По умолчанию нет активной записи
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(null);
    
    // Успешные ответы для других API-вызовов
    (timeTrackerApi.startTimeEntry as jest.Mock).mockResolvedValue(mockActiveEntry);
    (timeTrackerApi.pauseTimeEntry as jest.Mock).mockResolvedValue(mockPausedEntry);
    (timeTrackerApi.resumeTimeEntry as jest.Mock).mockResolvedValue(mockActiveEntry);
    (timeTrackerApi.stopTimeEntry as jest.Mock).mockResolvedValue(mockCompletedEntry);
    
    // Мокируем window.confirm для всех тестов
    window.confirm = jest.fn(() => true);
  });

  afterEach(() => {
    // Восстанавливаем оригинальный window.confirm после каждого теста
    window.confirm = originalConfirm;
  });

  test('renders time tracker when no active entry exists', async () => {
    await act(async () => {
      renderWithProviders(<TimeTracker />);
    });
    
    // Проверяем, что инициируется загрузка данных
    expect(timeTrackerApi.getActiveTimeEntry).toHaveBeenCalled();
    
    // Проверяем наличие кнопки "Начать запись"
    await waitFor(() => {
      expect(screen.getByText('Начать запись')).toBeInTheDocument();
    });
    
    // Проверяем, что таймер показывает нулевое время
    expect(screen.getByText('00:00:00')).toBeInTheDocument();
  });

  test('allows starting a new time entry', async () => {
    await act(async () => {
      renderWithProviders(<TimeTracker />);
    });
    
    // Ждем, пока компонент загрузится и покажет кнопку "Начать запись"
    await waitFor(() => {
      expect(screen.getByText('Начать запись')).toBeInTheDocument();
    });
    
    // Нажимаем кнопку "Начать запись"
    await act(async () => {
      fireEvent.click(screen.getByText('Начать запись'));
    });
    
    // Проверяем, что API вызван для создания новой записи
    expect(timeTrackerApi.startTimeEntry).toHaveBeenCalled();
    
    // Мокируем, что getActiveTimeEntry теперь вернет активную запись
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(mockActiveEntry);
    
    // Проверяем переход в состояние активной записи
    await act(async () => {
      await (timeTrackerApi.getActiveTimeEntry as jest.Mock).mock.results[0].value;
    });
    
    // Проверяем, что кнопки для активной записи появились
    await waitFor(() => {
      expect(screen.getByText('Пауза')).toBeInTheDocument();
      expect(screen.getByText('Завершить')).toBeInTheDocument();
    });
  });

  test('shows active entry when one exists', async () => {
    // Устанавливаем мок для активной записи
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(mockActiveEntry);
    
    await act(async () => {
      renderWithProviders(<TimeTracker />);
    });
    
    // Проверяем, что API вызван для проверки активной записи
    expect(timeTrackerApi.getActiveTimeEntry).toHaveBeenCalled();
    
    // Проверяем наличие кнопок для активной записи
    await waitFor(() => {
      expect(screen.getByText('Пауза')).toBeInTheDocument();
      expect(screen.getByText('Завершить')).toBeInTheDocument();
    });
    
    // Проверяем, что таймер не показывает нулевое время
    const timeElement = screen.getByText(/\d{2}:\d{2}:\d{2}/);
    expect(timeElement).toBeInTheDocument();
    expect(timeElement.textContent).not.toBe('00:00:00');
  });

  test('allows pausing an active time entry', async () => {
    // Устанавливаем мок для активной записи
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(mockActiveEntry);
    
    await act(async () => {
      renderWithProviders(<TimeTracker />);
    });
    
    // Ждем, пока компонент загрузится и покажет кнопку "Пауза"
    await waitFor(() => {
      expect(screen.getByText('Пауза')).toBeInTheDocument();
    });
    
    // Нажимаем кнопку "Пауза"
    await act(async () => {
      fireEvent.click(screen.getByText('Пауза'));
    });
    
    // Проверяем, что API вызван для паузы записи
    expect(timeTrackerApi.pauseTimeEntry).toHaveBeenCalledWith(1);
    
    // Мокируем, что getActiveTimeEntry теперь вернет приостановленную запись
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(mockPausedEntry);
    
    // Проверяем переход в состояние приостановленной записи
    await act(async () => {
      await (timeTrackerApi.pauseTimeEntry as jest.Mock).mock.results[0].value;
    });
    
    // После паузы должна отображаться кнопка "Продолжить"
    await waitFor(() => {
      expect(screen.queryByText('Пауза')).not.toBeInTheDocument(); 
      expect(screen.getByText('Продолжить')).toBeInTheDocument();
    });
  });

  test('allows resuming a paused time entry', async () => {
    // Устанавливаем мок для приостановленной записи
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(mockPausedEntry);
    
    await act(async () => {
      renderWithProviders(<TimeTracker />);
    });
    
    // Ждем, пока компонент загрузится и покажет кнопку "Продолжить"
    await waitFor(() => {
      expect(screen.getByText('Продолжить')).toBeInTheDocument();
    });
    
    // Нажимаем кнопку "Продолжить"
    await act(async () => {
      fireEvent.click(screen.getByText('Продолжить'));
    });
    
    // Проверяем, что API вызван для возобновления записи
    expect(timeTrackerApi.resumeTimeEntry).toHaveBeenCalledWith(1);
    
    // Мокируем, что getActiveTimeEntry теперь вернет активную запись
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(mockActiveEntry);
    
    // Проверяем переход в состояние активной записи
    await act(async () => {
      await (timeTrackerApi.resumeTimeEntry as jest.Mock).mock.results[0].value;
    });
    
    // После возобновления должна отображаться кнопка "Пауза"
    await waitFor(() => {
      expect(screen.queryByText('Продолжить')).not.toBeInTheDocument();
      expect(screen.getByText('Пауза')).toBeInTheDocument();
    });
  });

  test('allows stopping a time entry', async () => {
    // Устанавливаем мок для активной записи
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(mockActiveEntry);
    
    // Глобально переопределяем window.confirm на уровне JS объекта
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    
    try {
      await act(async () => {
        renderWithProviders(<TimeTracker />);
      });
      
      // Ждем, пока компонент загрузится и покажет кнопку "Завершить"
      await waitFor(() => {
        expect(screen.getByText('Завершить')).toBeInTheDocument();
      });
      
      // Нажимаем кнопку "Завершить"
      await act(async () => {
        const stopButton = screen.getByText('Завершить');
        fireEvent.click(stopButton);
      });
      
      // Проверяем, что window.confirm был вызван
      expect(confirmSpy).toHaveBeenCalled();
      
      // Проверяем, что API вызван для остановки записи
      expect(timeTrackerApi.stopTimeEntry).toHaveBeenCalledWith(1);
      
      // Мокируем, что getActiveTimeEntry теперь вернет null (нет активной записи)
      (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockResolvedValue(null);
      
      // Проверяем переход в состояние без активной записи
      await act(async () => {
        await (timeTrackerApi.stopTimeEntry as jest.Mock).mock.results[0].value;
      });
      
      // После завершения должна отображаться кнопка "Начать запись"
      await waitFor(() => {
        expect(screen.getByText('Начать запись')).toBeInTheDocument();
      });
    } finally {
      // Восстанавливаем оригинальный window.confirm
      confirmSpy.mockRestore();
    }
  });

  test('shows error message when API call fails', async () => {
    // Мокируем ошибку при вызове API
    (timeTrackerApi.getActiveTimeEntry as jest.Mock).mockRejectedValue(
      new Error('Ошибка сервера')
    );
    
    await act(async () => {
      renderWithProviders(<TimeTracker />);
    });
    
    // Проверяем, что отображается сообщение об ошибке
    await waitFor(() => {
      expect(screen.getByText(/Не удалось загрузить активную запись/i)).toBeInTheDocument();
    });
  });
}); 