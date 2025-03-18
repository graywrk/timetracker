import React, { useState, useEffect } from 'react';
import { 
  startTimeEntry as startWork, 
  pauseTimeEntry as pauseWork, 
  resumeTimeEntry as resumeWork, 
  stopTimeEntry as stopWork, 
  getActiveTimeEntry, 
  TimeEntry,
  startTimeEntryWithCategory
} from '../api/timetracker';
import CategorySelect from './CategorySelect';
import '../App.css';

const TimeTracker: React.FC = () => {
  // Состояния
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Форматирование времени
  const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Вычисление прошедшего времени
  const calculateElapsedTime = (entry: TimeEntry): number => {
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
      // Если запись приостановлена, считаем время от старта до последнего изменения статуса
      // и вычитаем общее время на паузе
      const pauseTime = new Date(entry.end_time || now);
      totalSeconds = Math.floor((pauseTime.getTime() - startTime.getTime()) / 1000) - entry.total_paused;
    } else if (entry.status === 'completed') {
      // Если запись завершена, берем общее время и вычитаем время на паузе
      if (entry.end_time) {
        const endTime = new Date(entry.end_time);
        totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000) - entry.total_paused;
      }
    }
    
    return Math.max(0, totalSeconds);
  };

  // Обновление таймера
  useEffect(() => {
    if (!activeEntry || activeEntry.status !== 'active') return;
    
    const intervalId = setInterval(() => {
      setElapsedTime(calculateElapsedTime(activeEntry));
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [activeEntry]);

  // Загрузка активной записи при монтировании компонента
  useEffect(() => {
    loadActiveEntry();
  }, []);

  // Загрузка активной записи
  const loadActiveEntry = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const entry = await getActiveTimeEntry();
      
      if (entry) {
        setActiveEntry(entry);
        setElapsedTime(calculateElapsedTime(entry));
      }
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить активную запись трекера');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик начала работы
  const handleStartWork = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let entry: TimeEntry;
      
      if (selectedCategoryId) {
        entry = await startTimeEntryWithCategory(selectedCategoryId);
      } else {
        entry = await startWork();
      }
      
      setActiveEntry(entry);
      setElapsedTime(calculateElapsedTime(entry));
    } catch (err) {
      console.error(err);
      setError('Не удалось начать отслеживание времени');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик паузы
  const handlePauseWork = async () => {
    if (!activeEntry) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const entry = await pauseWork(activeEntry.id);
      
      setActiveEntry(entry);
      setElapsedTime(calculateElapsedTime(entry));
    } catch (err) {
      console.error(err);
      setError('Не удалось приостановить отслеживание времени');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик возобновления работы
  const handleResumeWork = async () => {
    if (!activeEntry) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const entry = await resumeWork(activeEntry.id);
      
      setActiveEntry(entry);
      setElapsedTime(calculateElapsedTime(entry));
    } catch (err) {
      console.error(err);
      setError('Не удалось возобновить отслеживание времени');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик завершения работы
  const handleStopWork = async () => {
    if (!activeEntry) return;
    
    // Добавляем подтверждение перед завершением работы
    const confirmed = window.confirm('Вы уверены, что хотите завершить текущую запись времени?');
    if (!confirmed) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const entry = await stopWork(activeEntry.id);
      
      setActiveEntry(null);
      setElapsedTime(0);
    } catch (err) {
      console.error(err);
      setError('Не удалось завершить отслеживание времени');
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик выбора категории
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
  };

  return (
    <div className="time-tracker-container">
      <div className="time-tracker-card">
        <h2 className="mb-4">Трекер времени</h2>
        
        {error && (
          <div className="alert alert-danger mb-4">
            {error}
          </div>
        )}
        
        <div className="timer-display mb-4">
          <h3 className="timer">{formatTime(elapsedTime)}</h3>
          {activeEntry && activeEntry.category && (
            <p className="category-tag" style={{ backgroundColor: activeEntry.category.color }}>
              {activeEntry.category.name}
            </p>
          )}
        </div>
        
        {!activeEntry && (
          <div className="category-selection mb-4">
            <h3 className="mb-2">Выберите категорию</h3>
            <CategorySelect 
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={handleCategorySelect}
            />
          </div>
        )}
        
        <div className="timer-controls">
          {!activeEntry && (
            <button
              type="button"
              className="btn btn-success btn-lg"
              onClick={handleStartWork}
              disabled={isLoading}
              data-testid="start-button"
            >
              Начать
            </button>
          )}
          
          {activeEntry && activeEntry.status === 'active' && (
            <button
              type="button"
              className="btn btn-warning btn-lg"
              onClick={handlePauseWork}
              disabled={isLoading}
            >
              Пауза
            </button>
          )}
          
          {activeEntry && activeEntry.status === 'paused' && (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={handleResumeWork}
              disabled={isLoading}
            >
              Продолжить
            </button>
          )}
          
          {activeEntry && (
            <button
              type="button"
              className="btn btn-danger btn-lg"
              onClick={handleStopWork}
              disabled={isLoading}
            >
              Завершить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeTracker; 