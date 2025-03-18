import React, { useState, useEffect } from 'react';
import { getUserStats, TimeStats, TimeEntry } from '../api/statistics';
import { deleteTimeEntry } from '../api/timetracker';
import StatisticsCharts from './Charts/StatisticsCharts';
import '../App.css';

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate()
  });
  const [showCharts, setShowCharts] = useState(true);

  // Получаем дату начала периода (по умолчанию - начало текущего месяца)
  function getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(1); // Первый день текущего месяца
    return formatDate(date);
  }

  // Получаем дату окончания периода (по умолчанию - сегодня)
  function getDefaultEndDate(): string {
    return formatDate(new Date());
  }

  // Форматирует дату в формат YYYY-MM-DD
  function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Форматирует длительность из секунд в часы и минуты
  function formatDuration(seconds: number): string {
    if (!seconds) return '0 ч 0 мин';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${hours} ч ${minutes} мин`;
  }

  // Загружаем статистику
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserStats(dateRange.startDate, dateRange.endDate);
      setStats(data);
    } catch (err) {
      setError('Не удалось загрузить статистику');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик изменения дат
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик запроса статистики
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStats();
  };

  // Обработчик удаления записи
  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }
    
    try {
      setDeleteLoading(entryId);
      setError(null);
      setDeleteSuccess(null);
      
      await deleteTimeEntry(entryId);
      
      // Обновляем статистику после удаления
      await loadStats();
      
      setDeleteSuccess('Запись успешно удалена');
      
      // Скрываем сообщение об успехе через 3 секунды
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Ошибка при удалении записи: ${err.message}`);
      } else {
        setError('Ошибка при удалении записи');
      }
      console.error(err);
    } finally {
      setDeleteLoading(null);
    }
  };

  // Переключение между графиками и таблицами
  const toggleView = () => {
    setShowCharts(!showCharts);
  };

  // Загружаем статистику при первом рендере
  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1 className="page-title">Статистика времени</h1>
        
        {error && <div className="alert alert-danger">{error}</div>}
        {deleteSuccess && <div className="alert alert-success">{deleteSuccess}</div>}
        
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="date-range-picker">
            <div className="form-group">
              <label htmlFor="startDate">Начальная дата</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                className="form-control"
                value={dateRange.startDate}
                onChange={handleDateChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="endDate">Конечная дата</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                className="form-control"
                value={dateRange.endDate}
                onChange={handleDateChange}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Обновить
            </button>
          </div>
        </form>
        
        {loading ? (
          <div className="text-center">Загрузка данных...</div>
        ) : stats ? (
          <>
            <div className="stats-container">
              <div className="stat-card">
                <h3>Общая продолжительность</h3>
                <p className="stat-value">{formatDuration(stats.total_duration)}</p>
              </div>
              
              <div className="stat-card">
                <h3>Среднее время в день</h3>
                <p className="stat-value">{formatDuration(stats.average_daily_hours * 3600)}</p>
              </div>
              
              <div className="stat-card">
                <h3>Самая длинная сессия</h3>
                <p className="stat-value">{formatDuration(stats.longest_session)}</p>
                <p className="stat-label">Дата: {new Date(stats.longest_session_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="view-toggle">
              <button
                className={`btn ${showCharts ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={toggleView}
              >
                Графики
              </button>
              <button
                className={`btn ${!showCharts ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={toggleView}
              >
                Таблицы
              </button>
            </div>

            {showCharts ? (
              <StatisticsCharts stats={stats} />
            ) : (
              <>
                <h3 className="mt-4">Ежедневная статистика</h3>
                <div className="daily-stats">
                  {Object.entries(stats.daily_stats).length > 0 ? (
                    <table className="stats-table">
                      <thead>
                        <tr>
                          <th>Дата</th>
                          <th>Продолжительность</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(stats.daily_stats)
                          .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
                          .map(([date, duration]) => (
                            <tr key={date}>
                              <td>{new Date(date).toLocaleDateString()}</td>
                              <td>{formatDuration(duration)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>Нет данных за выбранный период</p>
                  )}
                </div>
              </>
            )}
            
            <h3 className="mt-4">Последние записи</h3>
            <div className="entries-list">
              {stats.entries && stats.entries.length > 0 ? (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Начало</th>
                      <th>Окончание</th>
                      <th>Длительность</th>
                      <th>Категория</th>
                      <th>Статус</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.entries.map(entry => {
                      const startTime = new Date(entry.start_time);
                      const endTime = entry.end_time ? new Date(entry.end_time) : null;
                      
                      // Вычисляем продолжительность
                      const duration = entry.end_time
                        ? Math.floor((new Date(entry.end_time).getTime() - startTime.getTime()) / 1000) - (entry.total_paused || 0)
                        : 0;
                      
                      return (
                        <tr key={entry.id}>
                          <td>{startTime.toLocaleString()}</td>
                          <td>{endTime ? endTime.toLocaleString() : '-'}</td>
                          <td>{formatDuration(duration)}</td>
                          <td>
                            {entry.category ? (
                              <span 
                                className="category-badge" 
                                style={{ backgroundColor: entry.category.color }}
                              >
                                {entry.category.name}
                              </span>
                            ) : (
                              <span className="text-muted">Без категории</span>
                            )}
                          </td>
                          <td>{entry.status === 'completed' ? 'Завершено' : 'В процессе'}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteEntry(entry.id)}
                              disabled={deleteLoading === entry.id}
                            >
                              {deleteLoading === entry.id ? 'Удаление...' : 'Удалить'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p>Нет записей за выбранный период</p>
              )}
            </div>
          </>
        ) : (
          <div>Нет данных для отображения</div>
        )}
      </div>
    </div>
  );
};

export default Statistics; 