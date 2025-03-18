import { API_BASE_URL } from './config';

export interface User {
  id: number;
  email: string;
  name: string;
}

/**
 * Авторизация пользователя
 * @param email Email пользователя
 * @param password Пароль пользователя
 * @returns Объект с данными пользователя и токеном
 */
export const login = async (email: string, password: string): Promise<{ token: string, user: User }> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Неверный email или пароль');
  }
  
  const data = await response.json();
  
  // Сохраняем токен и данные пользователя
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
};

/**
 * Регистрация нового пользователя
 * @param email Email пользователя
 * @param password Пароль пользователя
 * @param name Имя пользователя
 * @returns Объект с данными пользователя и токеном
 */
export const register = async (email: string, password: string, name: string): Promise<{ user: User; token: string }> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, name })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 409) {
      throw new Error('Пользователь с таким email уже существует');
    }
    throw new Error(errorData.message || 'Ошибка при регистрации');
  }
  
  const data = await response.json();
  
  // Сохраняем токен и данные пользователя в localStorage
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  
  return data;
};

/**
 * Изменение пароля пользователя
 * @param oldPassword Текущий пароль пользователя
 * @param newPassword Новый пароль пользователя
 * @returns Объект с сообщением об успешной смене пароля
 */
export const changePassword = async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Вы не авторизованы');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Ошибка при смене пароля');
  }
  
  return await response.json();
};

/**
 * Выход из системы
 */
export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Получение текущего пользователя
 * @returns Объект с данными пользователя или null, если пользователь не авторизован
 */
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    return null;
  }
}; 