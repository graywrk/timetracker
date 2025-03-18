import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Проверяем, активна ли текущая ссылка
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="header">
      <div className="container header-container">
        <div className="logo">
          <Link to="/">Трекер времени</Link>
        </div>
        
        <nav className="main-nav">
          {isAuthenticated ? (
            <>
              <ul className="nav-links">
                <li>
                  <Link 
                    to="/tracker" 
                    className={isActive('/tracker') ? 'active' : ''}
                  >
                    Трекер
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/statistics" 
                    className={isActive('/statistics') ? 'active' : ''}
                  >
                    Статистика
                  </Link>
                </li>
              </ul>
              
              <div className="user-menu">
                <span className="user-email">{user?.email}</span>
                <button onClick={handleLogout} className="btn btn-outline-danger btn-sm">
                  Выйти
                </button>
              </div>
            </>
          ) : (
            <ul className="nav-links">
              <li>
                <Link 
                  to="/login" 
                  className={isActive('/login') ? 'active' : ''}
                >
                  Вход
                </Link>
              </li>
              <li>
                <Link 
                  to="/register" 
                  className={isActive('/register') ? 'active' : ''}
                >
                  Регистрация
                </Link>
              </li>
            </ul>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header; 