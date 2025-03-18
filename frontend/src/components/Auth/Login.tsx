import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../App.css';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, error: authError, isLoading: authLoading, isAuthenticated } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Если пользователь уже аутентифицирован, перенаправляем на главную страницу
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Пользователь уже авторизован, перенаправление на главную');
      const state = location.state as LocationState;
      const from = state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка заполнения полей
    if (!email || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('Попытка авторизации с email:', email, 'Запомнить меня:', rememberMe);
      
      // Вызов метода контекста авторизации с передачей флага "Запомнить меня"
      await login(email, password, rememberMe);
      
      // Перенаправление происходит в useEffect
    } catch (err) {
      console.error('Ошибка при авторизации в компоненте Login:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Произошла ошибка при входе');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Переключение видимости пароля
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="container auth-container">
      <div className="card auth-form">
        <h1 className="page-title">Вход в систему</h1>
        
        {(error || authError) && <div className="alert alert-danger">{error || authError}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || authLoading}
              placeholder="Введите ваш email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Пароль</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || authLoading}
                placeholder="Введите ваш пароль"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            </div>
          </div>
          
          <div className="form-group remember-me">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                disabled={isLoading || authLoading}
              />
              <span className="checkmark"></span>
              Запомнить меня на 30 дней
            </label>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary btn-block mt-4"
            disabled={isLoading || authLoading}
          >
            {isLoading || authLoading ? "Вход..." : "Войти"}
          </button>
        </form>
        
        <div className="auth-links mt-3">
          <Link to="/register" className="auth-link">
            Нет аккаунта? Зарегистрироваться
          </Link>
          <Link to="/forgot-password" className="auth-link">
            Забыли пароль?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 