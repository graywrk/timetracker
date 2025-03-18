import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

const NotFound: React.FC = () => {
  return (
    <div className="container flex-center">
      <div className="card text-center">
        <h1 className="page-title">404</h1>
        <h2>Страница не найдена</h2>
        <p>Извините, запрашиваемая страница не существует.</p>
        <div className="mt-4">
          <Link to="/" className="btn btn-primary">
            Вернуться на главную
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 