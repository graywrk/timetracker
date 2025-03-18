import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from '../../api/timetracker';
import '../../App.css';
import './Categories.css';

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для новой/редактируемой категории
  const [newCategory, setNewCategory] = useState({
    id: 0,
    name: '',
    color: '#3498db'
  });
  
  // Состояние для отслеживания режима редактирования
  const [editMode, setEditMode] = useState(false);
  
  // Загрузка категорий
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Ошибка при загрузке категорий:', err);
      setError('Не удалось загрузить категории');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик создания/обновления категории
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategory.name.trim()) {
      setError('Название категории не может быть пустым');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (editMode) {
        // Обновление существующей категории
        await updateCategory(newCategory.id, newCategory.name, newCategory.color);
      } else {
        // Создание новой категории
        await createCategory(newCategory.name, newCategory.color);
      }
      
      // Сбрасываем форму и перезагружаем категории
      resetForm();
      await loadCategories();
    } catch (err) {
      console.error('Ошибка при сохранении категории:', err);
      setError('Не удалось сохранить категорию');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик удаления категории
  const handleDelete = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      await deleteCategory(id);
      await loadCategories();
    } catch (err) {
      console.error('Ошибка при удалении категории:', err);
      setError('Не удалось удалить категорию');
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик редактирования категории
  const handleEdit = (category: Category) => {
    setNewCategory({
      id: category.id,
      name: category.name,
      color: category.color
    });
    setEditMode(true);
  };
  
  // Сброс формы
  const resetForm = () => {
    setNewCategory({
      id: 0,
      name: '',
      color: '#3498db'
    });
    setEditMode(false);
  };
  
  // Загружаем категории при монтировании компонента
  useEffect(() => {
    loadCategories();
  }, []);
  
  return (
    <div className="container">
      <div className="card">
        <h1 className="page-title">Управление категориями</h1>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        {/* Форма для создания/редактирования категории */}
        <form onSubmit={handleSubmit} className="category-form">
          <h3>{editMode ? 'Редактирование категории' : 'Создание новой категории'}</h3>
          
          <div className="form-group">
            <label htmlFor="categoryName">Название</label>
            <input
              type="text"
              id="categoryName"
              className="form-control"
              value={newCategory.name}
              onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
              placeholder="Название категории"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="categoryColor">Цвет</label>
            <div className="color-picker-container">
              <input
                type="color"
                id="categoryColor"
                className="form-control color-picker"
                value={newCategory.color}
                onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
              />
              <span className="color-code">{newCategory.color}</span>
            </div>
          </div>
          
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {editMode ? 'Сохранить' : 'Создать'}
            </button>
            
            {editMode && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Отмена
              </button>
            )}
          </div>
        </form>
        
        {/* Список существующих категорий */}
        <div className="categories-list">
          <h3>Существующие категории</h3>
          
          {loading && <div className="text-center">Загрузка категорий...</div>}
          
          {!loading && categories.length === 0 && (
            <div className="empty-message">У вас еще нет категорий. Создайте первую категорию!</div>
          )}
          
          {!loading && categories.length > 0 && (
            <div className="categories-grid">
              {categories.map(category => (
                <div key={category.id} className="category-card">
                  <div className="category-color-indicator" style={{ backgroundColor: category.color }}></div>
                  <div className="category-name">{category.name}</div>
                  <div className="category-actions">
                    <button 
                      className="btn btn-small btn-edit" 
                      onClick={() => handleEdit(category)}
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn btn-small btn-delete" 
                      onClick={() => handleDelete(category.id)}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories; 