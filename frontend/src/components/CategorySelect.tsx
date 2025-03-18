import React, { useState, useEffect } from 'react';
import { 
  Category, 
  getCategories, 
  createCategory 
} from '../api/timetracker';

interface CategorySelectProps {
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number) => void;
}

const CategorySelect: React.FC<CategorySelectProps> = ({ 
  selectedCategoryId, 
  onCategorySelect 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<{ name: string; color: string }>({
    name: '',
    color: '#4a6bff'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const categoriesData = await getCategories();
      setCategories(categoriesData);
      
      // Если нет выбранной категории и есть доступные категории, выбираем первую
      if (selectedCategoryId === null && categoriesData.length > 0) {
        onCategorySelect(categoriesData[0].id);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке категорий:', err);
      setError('Ошибка загрузки категорий');
      setIsLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategory.name.trim()) {
      setError('Название категории не может быть пустым');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const createdCategory = await createCategory(newCategory.name, newCategory.color);
      
      setCategories(prev => [...prev, createdCategory]);
      onCategorySelect(createdCategory.id);
      setNewCategory({ name: '', color: '#4a6bff' });
      setShowForm(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Не удалось создать категорию');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && categories.length === 0) {
    return <div>Загрузка категорий...</div>;
  }

  if (error && categories.length === 0) {
    return <div className="error">{error}</div>;
  }

  // Находим выбранную категорию, если selectedCategoryId не null
  const selectedCategory = selectedCategoryId !== null
    ? categories.find(c => c.id === selectedCategoryId)
    : undefined;

  return (
    <div className="category-selection">
      {!showForm ? (
        <>
          <div className="dropdown">
            <button 
              className="btn btn-secondary dropdown-toggle" 
              type="button" 
              id="dropdownMenuButton" 
              data-bs-toggle="dropdown" 
              aria-expanded="false"
            >
              {selectedCategory ? selectedCategory.name : 'Выберите категорию'}
            </button>
            <ul className="dropdown-menu" aria-labelledby="dropdownMenuButton">
              {categories.map(category => (
                <li key={category.id}>
                  <button 
                    className="dropdown-item" 
                    type="button"
                    onClick={() => onCategorySelect(category.id)}
                  >
                    <span 
                      className="category-color-dot" 
                      style={{ backgroundColor: category.color }}
                    ></span>
                    {category.name}
                  </button>
                </li>
              ))}
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button 
                  className="dropdown-item" 
                  type="button"
                  onClick={() => setShowForm(true)}
                >
                  Создать новую
                </button>
              </li>
            </ul>
          </div>
          {error && <div className="error mt-2">{error}</div>}
        </>
      ) : (
        <div className="category-form">
          <h5>Создание новой категории</h5>
          <form onSubmit={handleCreateCategory}>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Название категории"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">
                Выбрать цвет:
                <input
                  type="color"
                  className="form-control form-control-color ms-2"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                />
              </label>
            </div>
            {error && <div className="error mb-3">{error}</div>}
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary">Создать</button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CategorySelect; 