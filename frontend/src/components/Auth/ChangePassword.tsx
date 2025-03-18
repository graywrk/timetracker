import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import '../../App.css';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Проверка заполнения полей
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    // Проверка совпадения паролей
    if (newPassword !== confirmPassword) {
      setError('Новый пароль и подтверждение не совпадают');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      // Вызываем API для смены пароля
      await changePassword(oldPassword, newPassword);
      
      // Уведомляем пользователя об успехе
      setSuccess('Пароль успешно изменен');
      
      // Очищаем форму
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Через 3 секунды переходим на главную страницу
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err) {
      console.error('Ошибка при смене пароля:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Произошла ошибка при смене пароля');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Переключение видимости пароля
  const toggleOldPasswordVisibility = () => {
    setShowOldPassword(!showOldPassword);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  return (
    <div className="container auth-container">
      <div className="card auth-form">
        <h1 className="page-title">Смена пароля</h1>
        
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="oldPassword">Текущий пароль</label>
            <div className="password-input-wrapper">
              <input
                type={showOldPassword ? "text" : "password"}
                id="oldPassword"
                className="form-control"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Введите текущий пароль"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={toggleOldPasswordVisibility}
              >
                {showOldPassword ? "Скрыть" : "Показать"}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="newPassword">Новый пароль</label>
            <div className="password-input-wrapper">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                placeholder="Введите новый пароль"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={toggleNewPasswordVisibility}
              >
                {showNewPassword ? "Скрыть" : "Показать"}
              </button>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Подтверждение пароля</label>
            <input
              type={showNewPassword ? "text" : "password"}
              id="confirmPassword"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              placeholder="Подтвердите новый пароль"
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary btn-block mt-4"
            disabled={isLoading}
          >
            {isLoading ? "Сохранение..." : "Изменить пароль"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword; 