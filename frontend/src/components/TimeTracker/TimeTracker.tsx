import React, { useState, useEffect } from 'react';
import { startTimeEntry as startWork, startTimeEntryWithCategory, pauseTimeEntry as pauseWork, resumeTimeEntry as resumeWork, stopTimeEntry as stopWork, getActiveTimeEntry, TimeEntry, getCategories, Category } from '../../api/timetracker';
import '../../App.css';
import './TimeTracker.css';

const TimeTracker: React.FC = () => {
  // Состояния
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Дополнительное состояние для явного контроля работы таймера
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  // Состояние для категорий
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  // Для хранения интервала таймера
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  // Форматирование времени
  const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Вычисление прошедшего времени
  const calculateElapsedTime = React.useCallback((entry: TimeEntry): number => {
    if (!entry) return 0;

    const now = new Date();
    let totalSeconds = 0;
    
    const startTime = new Date(entry.start_time);
    
    if (entry.status === 'active') {
      // Если запись активна, считаем время от старта до текущего момента
      totalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      
      // Вычитаем общее время на паузе
      if (entry.total_paused) {
        totalSeconds -= entry.total_paused;
      }
    } else if (entry.status === 'paused') {
      // Если на паузе, считаем время от старта до момента паузы
      // Так как поле paused_at отсутствует, используем текущее время
      const pausedAt = now;
      totalSeconds = Math.floor((pausedAt.getTime() - startTime.getTime()) / 1000);
      
      // Вычитаем общее время на паузе до текущей паузы
      if (entry.total_paused) {
        totalSeconds -= entry.total_paused;
      }
    } else if (entry.status === 'completed') {
      // Если завершена, считаем от старта до конца
      const endTime = new Date(entry.end_time || now);
      totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Вычитаем общее время на паузе
      if (entry.total_paused) {
        totalSeconds -= entry.total_paused;
      }
    }
    
    return totalSeconds > 0 ? totalSeconds : 0;
  }, []);

  // Загрузка активной записи
  const loadActiveEntry = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Загрузка активной записи...');
      const entry = await getActiveTimeEntry();
      console.log('Полученный ответ:', entry);
      
      // Если нет активной записи, останавливаем таймер и сбрасываем время
      if (!entry || (entry as any).status === 'no_active_entry') {
        console.log('Нет активной записи, сбрасываем состояние');
        setActiveEntry(null);
        setElapsedTime(0);
        setIsTimerRunning(false);
        return;
      }
      
      // Проверяем и устанавливаем статус таймера
      if (entry && entry.status === 'active') {
        console.log('Найдена активная запись, запускаем таймер');
        setActiveEntry(entry);
        setElapsedTime(calculateElapsedTime(entry));
        setIsTimerRunning(true);
      } else if (entry && entry.status === 'paused') {
        console.log('Найдена запись на паузе');
        setActiveEntry(entry);
        setElapsedTime(calculateElapsedTime(entry));
        setIsTimerRunning(false);
      } else if (entry && entry.status === 'completed') {
        console.log('Запись времени уже завершена, готов начать новую сессию');
        setActiveEntry(entry); // Сохраняем для отображения статуса
        setElapsedTime(calculateElapsedTime(entry));
        setIsTimerRunning(false);
      } else {
        console.log('Неизвестный статус записи:', entry.status);
        setActiveEntry(entry);
        setElapsedTime(calculateElapsedTime(entry));
        setIsTimerRunning(false);
      }
    } catch (err) {
      console.error('Ошибка при загрузке активной записи:', err);
      setError('Не удалось загрузить активную запись времени');
      setActiveEntry(null); // Сбрасываем активную запись при ошибке
      setIsTimerRunning(false);
    } finally {
      // Явно указываем, что загрузка завершена
      console.log('Загрузка завершена, устанавливаем isLoading в false');
      setIsLoading(false);
    }
  }, [calculateElapsedTime]);

  // Принудительно сбрасываем состояние isLoading через 5 секунд, если оно застряло
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.log('Таймаут загрузки - принудительный сброс isLoading');
        setIsLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Загрузка категорий
  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Ошибка при загрузке категорий:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // Старт записи времени
  const startTimer = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let newEntry;
      if (selectedCategoryId) {
        newEntry = await startTimeEntryWithCategory(selectedCategoryId);
      } else {
        newEntry = await startWork();
      }
      
      setActiveEntry(newEntry);
      setElapsedTime(0);
      setIsTimerRunning(true);
    } catch (err) {
      console.error('Ошибка при старте таймера:', err);
      setError('Не удалось начать запись времени');
    } finally {
      setIsLoading(false);
    }
  };

  // Пауза записи времени
  const pauseTimer = async (entryId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Остановить таймер
      setIsTimerRunning(false);
      
      const entry = await pauseWork(entryId);
      setActiveEntry(entry);
    } catch (err) {
      console.error('Ошибка при постановке на паузу:', err);
      setError('Не удалось поставить на паузу');
    } finally {
      setIsLoading(false);
    }
  };

  // Возобновление записи времени
  const resumeTimer = async (entryId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const entry = await resumeWork(entryId);
      setActiveEntry(entry);
      setIsTimerRunning(true);
    } catch (err) {
      console.error('Ошибка при возобновлении:', err);
      setError('Не удалось возобновить запись');
    } finally {
      setIsLoading(false);
    }
  };

  // Завершение записи времени
  const stopTimer = async (entryId: number) => {
    // Запрашиваем подтверждение
    if (!window.confirm('Вы уверены, что хотите завершить запись времени?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setIsTimerRunning(false);
      
      const entry = await stopWork(entryId);
      setActiveEntry(null);
      setElapsedTime(0);
    } catch (err) {
      console.error('Ошибка при завершении:', err);
      setError('Не удалось завершить запись');
    } finally {
      setIsLoading(false);
    }
  };

  // Отдельный эффект для таймера, который зависит от isTimerRunning
  useEffect(() => {
    // Останавливаем предыдущий таймер, если он был
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
    
    // Если таймер должен работать, создаем новый интервал
    if (isTimerRunning) {
      console.log('Запускаем таймер обновления времени');
      const newTimer = setInterval(() => {
        // Увеличиваем счетчик каждую секунду
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
      setTimer(newTimer);
    }
    
    // Очищаем таймер при размонтировании
    return () => {
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    };
  }, [isTimerRunning]);

  // Загружаем статистику при первом рендере
  useEffect(() => {
    loadActiveEntry();
    loadCategories();
    
    return () => {
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    };
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1 className="page-title">Трекер времени</h1>
        
        {error && (
          <div className="alert alert-danger">
            {error}
            <button 
              className="btn btn-sm btn-primary ml-2" 
              onClick={loadActiveEntry}
              style={{ marginLeft: '10px' }}
            >
              Повторить загрузку
            </button>
          </div>
        )}
        
        <div className="timer-display">
          <h2 className="time">{formatTime(elapsedTime)}</h2>
          <p className="status">
            {isLoading && !activeEntry ? 'Загрузка...' : 
             activeEntry ? `Статус: ${
               activeEntry.status === 'active' ? 'Активно' : 
               activeEntry.status === 'paused' ? 'На паузе' : 'Завершено'
             }` : 'Нет активного отслеживания'}
          </p>
        </div>
        
        <div className="timer-controls" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {!activeEntry ? (
            <>
              <div className="category-selector">
                <label htmlFor="category">Выберите категорию:</label>
                <select 
                  id="category"
                  className="form-control"
                  value={selectedCategoryId || ''}
                  onChange={(e) => setSelectedCategoryId(e.target.value ? Number(e.target.value) : null)}
                  disabled={isLoadingCategories}
                >
                  <option value="">Без категории</option>
                  {categories && categories.length > 0 && categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={startTimer}
                disabled={isLoading}
              >
                {isLoading ? 'Запуск...' : 'Начать запись'}
              </button>
            </>
          ) : activeEntry.status === 'active' ? (
            <>
              <button 
                className="btn btn-warning" 
                onClick={() => pauseTimer(activeEntry.id)}
                disabled={isLoading}
              >
                {isLoading ? 'Приостановка...' : 'Пауза'}
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => stopTimer(activeEntry.id)}
                disabled={isLoading}
              >
                {isLoading ? 'Завершение...' : 'Завершить'}
              </button>
            </>
          ) : activeEntry.status === 'paused' ? (
            <>
              <button 
                className="btn btn-primary" 
                onClick={() => resumeTimer(activeEntry.id)}
                disabled={isLoading}
              >
                {isLoading ? 'Возобновление...' : 'Продолжить'}
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => stopTimer(activeEntry.id)}
                disabled={isLoading}
              >
                {isLoading ? 'Завершение...' : 'Завершить'}
              </button>
            </>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={startTimer}
              disabled={isLoading}
            >
              {isLoading ? 'Запуск...' : 'Новая запись'}
            </button>
          )}
          
          {/* Отображаем сообщение о загрузке рядом с кнопками, если isLoading активно */}
          {isLoading && (
            <span className="ml-2 text-info">Обработка...</span>
          )}
        </div>
        
        {activeEntry && activeEntry.category && (
          <div className="entry-category">
            <span className="category-label">Категория:</span>
            <span 
              className="category-badge" 
              style={{ backgroundColor: activeEntry.category.color }}
            >
              {activeEntry.category.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeTracker; 