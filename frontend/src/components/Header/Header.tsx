import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import UserMenu from './UserMenu';
import '../../App.css';

const Header: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Проверяем, активна ли ссылка
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        Трекер времени
      </Link>
      
      <nav>
        <ul className="navbar-nav">
          {isAuthenticated ? (
            <>
              <li className="nav-item">
                <Link 
                  to="/" 
                  className={`nav-link ${isActive('/') ? 'active' : ''}`}
                >
                  Трекер
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  to="/statistics" 
                  className={`nav-link ${isActive('/statistics') ? 'active' : ''}`}
                >
                  Статистика
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  to="/categories" 
                  className={`nav-link ${isActive('/categories') ? 'active' : ''}`}
                >
                  Категории
                </Link>
              </li>
              <li className="nav-item">
                <UserMenu />
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link 
                  to="/login" 
                  className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                >
                  Вход
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  to="/register" 
                  className={`nav-link ${isActive('/register') ? 'active' : ''}`}
                >
                  Регистрация
                </Link>
              </li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};

export default Header; 