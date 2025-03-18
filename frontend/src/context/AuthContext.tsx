import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { login as apiLogin, register as apiRegister, changePassword as apiChangePassword } from '../api/auth';

interface User {
  id: number;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Проверяем, есть ли сохраненный токен и пользователь
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    console.log('Проверка сохраненных данных авторизации:', { 
      hasToken: !!token, 
      hasUser: !!savedUser 
    });

    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('Пользователь восстановлен из localStorage:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        // Если JSON невалиден, очищаем localStorage
        console.error('Ошибка при разборе данных пользователя:', e);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setError(null);
      setIsLoading(true);
      console.log('Попытка авторизации для:', email, 'Запомнить меня:', rememberMe);
      const response = await apiLogin(email, password);
      console.log('Успешная авторизация, получен ответ:', response);
      
      // Сохраняем токен в нужное хранилище в зависимости от флага "Запомнить меня"
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', response.token);
      
      // Получение ID пользователя из токена (декодирование JWT)
      try {
        const payload = JSON.parse(atob(response.token.split('.')[1]));
        console.log('Декодированные данные из токена:', payload);
        const user = { 
          id: payload.user_id || 0, 
          email: email 
        };
        
        // Сохраняем данные пользователя
        storage.setItem('user', JSON.stringify(user));
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('rememberMe');
        }
        
        setUser(user);
      } catch (e) {
        console.error('Ошибка при декодировании токена:', e);
        throw new Error('Недействительный токен авторизации');
      }
    } catch (err) {
      console.error('Ошибка при авторизации:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Неверный логин или пароль');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string = email.split('@')[0]) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await apiRegister(email, password, name);
      localStorage.setItem('token', response.token);
      
      // Получение ID пользователя из токена (декодирование JWT)
      const payload = JSON.parse(atob(response.token.split('.')[1]));
      const user = { 
        id: payload.user_id || 0, 
        email: email 
      };
      
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Произошла ошибка при регистрации');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      setError(null);
      setIsLoading(true);
      await apiChangePassword(oldPassword, newPassword);
    } catch (err) {
      console.error('Ошибка при смене пароля:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Произошла ошибка при смене пароля');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    changePassword,
    error,
    loading: isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 