import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header/Header';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ChangePassword from './components/Auth/ChangePassword';
import TimeTracker from './components/TimeTracker/TimeTracker';
import Statistics from './components/Statistics/Statistics';
import Categories from './components/Categories/Categories';
import NotFound from './components/NotFound/NotFound';
import { useAuth } from './context/AuthContext';
import './App.css';

// Компонент для защищенных маршрутов
const ProtectedRoute: React.FC<{ element: React.ReactNode }> = ({ element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  // Пока проверяем аутентификацию, показываем загрузку
  if (isLoading) {
    return <div className="container text-center mt-5">Загрузка приложения...</div>;
  }
  
  // Если не аутентифицирован, перенаправляем на страницу входа
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Если аутентифицирован, отображаем защищенный компонент
  return <>{element}</>;
};

const App: React.FC = () => {
  const { isLoading } = useAuth();
  
  // Пока загружается контекст авторизации, показываем общую загрузку
  if (isLoading) {
    return (
      <div className="App">
        <div className="container text-center mt-5">
          <h2>Загрузка приложения...</h2>
        </div>
      </div>
    );
  }
  
  return (
    <div className="App">
      <Header />
      <main className="container">
        <Routes>
          {/* Публичные маршруты */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Защищенные маршруты */}
          <Route path="/" element={<ProtectedRoute element={<TimeTracker />} />} />
          <Route path="/statistics" element={<ProtectedRoute element={<Statistics />} />} />
          <Route path="/categories" element={<ProtectedRoute element={<Categories />} />} />
          <Route path="/change-password" element={<ProtectedRoute element={<ChangePassword />} />} />
          
          {/* Маршрут для страницы 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
};

export default App; 