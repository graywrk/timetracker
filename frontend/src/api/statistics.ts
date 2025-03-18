import { API_BASE_URL } from './config';
import { Category } from './timetracker';

export interface TimeEntry {
  id: number;
  user_id: number;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'paused' | 'completed';
  total_paused: number;
  category_id?: number;
  category?: Category;
}

export interface TimeStats {
  total_duration: number;
  average_daily_hours: number;
  longest_session: number;
  longest_session_date: string;
  daily_stats: Record<string, number>;
  entries: TimeEntry[];
}

/**
 * Получает статистику пользователя за указанный период
 * @param startDate Начальная дата в формате YYYY-MM-DD
 * @param endDate Конечная дата в формате YYYY-MM-DD
 * @returns Объект со статистикой
 */
export const getUserStats = async (startDate: string, endDate: string): Promise<TimeStats> => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Пользователь не авторизован');
  }
  
  console.log('Запрос статистики с параметрами:', { startDate, endDate });
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/custom?start_date=${startDate}&end_date=${endDate}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Ошибка при запросе статистики:', errorData);
      throw new Error(errorData.message || 'Не удалось получить статистику');
    }
    
    const data = await response.json();
    console.log('Получены данные статистики:', data);
    
    // Проверим наличие необходимых полей
    if (!data.total_duration && data.total_duration !== 0) {
      console.warn('Отсутствует поле total_duration в ответе API');
    }
    
    // Преобразуем все числовые значения в числа для уверенности
    if (data.total_duration !== undefined) {
      data.total_duration = Number(data.total_duration);
    }
    
    if (data.average_daily_hours !== undefined) {
      data.average_daily_hours = Number(data.average_daily_hours);
    }
    
    if (data.longest_session !== undefined) {
      data.longest_session = Number(data.longest_session);
    }
    
    // Преобразуем значения в daily_stats
    if (data.daily_stats) {
      Object.keys(data.daily_stats).forEach(key => {
        data.daily_stats[key] = Number(data.daily_stats[key]);
      });
    }
    
    return data;
  } catch (error) {
    console.error('Ошибка при получении статистики:', error);
    throw error;
  }
}; 