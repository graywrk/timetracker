import React, { useState, useEffect } from 'react';
import { getUserStats, TimeStats } from '../../api/statistics';
import StatisticsCharts from '../Charts/StatisticsCharts';
import '../../App.css';

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate()
  });

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
    console.log('Форматирование продолжительности', { seconds, type: typeof seconds });
    
    if (!seconds || isNaN(seconds)) {
      console.warn('Получено нулевое или невалидное значение продолжительности');
      return '0 ч 0 мин';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    console.log('Рассчитанная продолжительность', { hours, minutes });
    return `${hours} ч ${minutes} мин`;
  }

  // Загружаем статистику
  const loadStats = async () => {
    try {
      console.log('Начало загрузки статистики...');
      setLoading(true);
      setError(null);
      
      console.log('Запрос статистики за период:', dateRange);
      const data = await getUserStats(dateRange.startDate, dateRange.endDate);
      
      console.log('Получены данные статистики:', {
        total_duration: data.total_duration,
        average_daily_hours: data.average_daily_hours,
        longest_session: data.longest_session,
        entries_count: data.entries?.length || 0,
        has_daily_stats: data.daily_stats ? Object.keys(data.daily_stats).length > 0 : false
      });
      
      setStats(data);
    } catch (err) {
      console.error('Ошибка при загрузке статистики:', err);
      setError('Не удалось загрузить статистику');
    } finally {
      setLoading(false);
      console.log('Завершение загрузки статистики');
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

  // Загружаем статистику при первом рендере
  useEffect(() => {
    console.log('Компонент Statistics смонтирован, загружаем статистику...');
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1 className="page-title">Статистика времени</h1>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
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
          <div className="stats-container">
            <div className="stat-card">
              <h3>Общая продолжительность</h3>
              <p className="stat-value">{formatDuration(stats.total_duration)}</p>
              <p className="stat-debug">Исходное значение: {stats.total_duration} сек.</p>
            </div>
            
            <div className="stat-card">
              <h3>Среднее время в день</h3>
              <p className="stat-value">{formatDuration(stats.average_daily_hours * 3600)}</p>
              <p className="stat-debug">Исходное значение: {stats.average_daily_hours} часов</p>
            </div>
            
            <div className="stat-card">
              <h3>Самая длинная сессия</h3>
              <p className="stat-value">{formatDuration(stats.longest_session)}</p>
              <p className="stat-debug">Исходное значение: {stats.longest_session} сек.</p>
              <p className="stat-label">Дата: {new Date(stats.longest_session_date).toLocaleDateString()}</p>
            </div>
            
            {/* Графики статистики */}
            <StatisticsCharts stats={stats} />
            
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
                          <td>{formatDuration(duration as number)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <p>Нет данных за выбранный период</p>
              )}
            </div>
            
            <h3 className="mt-4">Последние записи</h3>
            <div className="entries-list">
              {stats.entries && stats.entries.length > 0 ? (
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th>Начало</th>
                      <th>Окончание</th>
                      <th>Длительность</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.entries.map(entry => {
                      const startTime = new Date(entry.start_time);
                      const endTime = entry.end_time ? new Date(entry.end_time) : null;
                      
                      // Вычисляем продолжительность
                      let duration = 0;
                      if (endTime) {
                        duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
                        if (entry.total_paused) {
                          duration -= entry.total_paused;
                        }
                      }
                      
                      return (
                        <tr key={entry.id}>
                          <td>{startTime.toLocaleString()}</td>
                          <td>{endTime ? endTime.toLocaleString() : '-'}</td>
                          <td>{endTime ? formatDuration(duration) : '-'}</td>
                          <td>
                            {entry.status === 'active' ? 'Активно' : 
                             entry.status === 'paused' ? 'На паузе' : 'Завершено'}
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
          </div>
        ) : (
          <div className="text-center">Нет данных</div>
        )}
      </div>
    </div>
  );
};

export default Statistics; 