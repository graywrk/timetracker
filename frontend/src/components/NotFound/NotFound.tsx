import React from 'react';
import { Link } from 'react-router-dom';
import '../../App.css';

const NotFound: React.FC = () => {
  return (
    <div className="container not-found-container">
      <div className="card not-found-card">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Страница не найдена</h2>
        <p className="not-found-text">
          Извините, запрашиваемая страница не существует или была перемещена.
        </p>
        <Link to="/" className="btn btn-primary not-found-button">
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
};

export default NotFound; 