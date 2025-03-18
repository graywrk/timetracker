package categories

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/graywrk/timetracker/backend/internal/models"
)

// Mock репозитория для тестирования сервиса
type MockCategoryRepo struct {
	categories map[uint]*models.Category
	nextID     uint
}

func NewMockCategoryRepo() *MockCategoryRepo {
	return &MockCategoryRepo{
		categories: make(map[uint]*models.Category),
		nextID:     1,
	}
}

func (m *MockCategoryRepo) CreateCategory(ctx context.Context, category *models.Category) error {
	category.ID = m.nextID
	category.CreatedAt = time.Now()
	category.UpdatedAt = time.Now()
	m.categories[category.ID] = category
	m.nextID++
	return nil
}

func (m *MockCategoryRepo) GetCategoryByID(ctx context.Context, id uint) (*models.Category, error) {
	category, exists := m.categories[id]
	if !exists {
		return nil, errors.New("категория не найдена")
	}
	return category, nil
}

func (m *MockCategoryRepo) GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error) {
	var result []*models.Category
	for _, category := range m.categories {
		if category.UserID == userID {
			result = append(result, category)
		}
	}
	return result, nil
}

func (m *MockCategoryRepo) UpdateCategory(ctx context.Context, category *models.Category) error {
	_, exists := m.categories[category.ID]
	if !exists {
		return errors.New("категория не найдена")
	}
	category.UpdatedAt = time.Now()
	m.categories[category.ID] = category
	return nil
}

func (m *MockCategoryRepo) DeleteCategory(ctx context.Context, id uint) error {
	_, exists := m.categories[id]
	if !exists {
		return errors.New("категория не найдена")
	}
	delete(m.categories, id)
	return nil
}

// Заглушки для других методов Repository
func (m *MockCategoryRepo) CreateUser(ctx context.Context, user *models.User) error {
	return nil
}

func (m *MockCategoryRepo) GetUserByID(ctx context.Context, id uint) (*models.User, error) {
	return nil, nil
}

func (m *MockCategoryRepo) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return nil, nil
}

func (m *MockCategoryRepo) UpdateUser(ctx context.Context, user *models.User) error {
	return nil
}

func (m *MockCategoryRepo) DeleteUser(ctx context.Context, id uint) error {
	return nil
}

func (m *MockCategoryRepo) CreateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	return nil
}

func (m *MockCategoryRepo) GetTimeEntryByID(ctx context.Context, id uint) (*models.TimeEntry, error) {
	return nil, nil
}

func (m *MockCategoryRepo) GetTimeEntriesByUserID(ctx context.Context, userID uint) ([]*models.TimeEntry, error) {
	return nil, nil
}

func (m *MockCategoryRepo) GetActiveTimeEntryForUser(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	return nil, nil
}

func (m *MockCategoryRepo) UpdateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	return nil
}

func (m *MockCategoryRepo) DeleteTimeEntry(ctx context.Context, id uint) error {
	return nil
}

func (m *MockCategoryRepo) GetUserStatsByPeriod(ctx context.Context, userID uint, startDate, endDate string) ([]*models.TimeEntry, error) {
	return nil, nil
}

// Тесты

func TestCreateCategory(t *testing.T) {
	repo := NewMockCategoryRepo()
	service := NewService(repo)
	ctx := context.Background()

	// Тест 1: Успешное создание категории
	category, err := service.CreateCategory(ctx, 1, "Работа", "#ff0000")
	if err != nil {
		t.Errorf("Ошибка при создании категории: %v", err)
	}
	if category.Name != "Работа" {
		t.Errorf("Ожидалось Name='Работа', получено '%s'", category.Name)
	}
	if category.Color != "#ff0000" {
		t.Errorf("Ожидалось Color='#ff0000', получено '%s'", category.Color)
	}
	if category.UserID != 1 {
		t.Errorf("Ожидалось UserID=1, получено %d", category.UserID)
	}

	// Тест 2: Создание категории с пустым названием
	_, err = service.CreateCategory(ctx, 1, "", "#ff0000")
	if err == nil {
		t.Error("Ожидалась ошибка при пустом названии категории")
	}

	// Тест 3: Создание категории с пустым цветом (должен использоваться цвет по умолчанию)
	category, err = service.CreateCategory(ctx, 1, "Учеба", "")
	if err != nil {
		t.Errorf("Ошибка при создании категории: %v", err)
	}
	if category.Color != "#4a6bff" {
		t.Errorf("Ожидался цвет по умолчанию '#4a6bff', получено '%s'", category.Color)
	}
}

func TestGetCategoriesByUserID(t *testing.T) {
	repo := NewMockCategoryRepo()
	service := NewService(repo)
	ctx := context.Background()

	// Создаем категории для пользователя 1
	service.CreateCategory(ctx, 1, "Работа", "#ff0000")
	service.CreateCategory(ctx, 1, "Учеба", "#00ff00")

	// Создаем категорию для пользователя 2
	service.CreateCategory(ctx, 2, "Хобби", "#0000ff")

	// Получаем категории пользователя 1
	categories, err := service.GetCategoriesByUserID(ctx, 1)
	if err != nil {
		t.Errorf("Ошибка при получении категорий: %v", err)
	}

	// Проверяем, что получили именно 2 категории для пользователя 1
	if len(categories) != 2 {
		t.Errorf("Ожидалось 2 категории, получено %d", len(categories))
	}

	// Получаем категории пользователя 2
	categories, err = service.GetCategoriesByUserID(ctx, 2)
	if err != nil {
		t.Errorf("Ошибка при получении категорий: %v", err)
	}

	// Проверяем, что получили именно 1 категорию для пользователя 2
	if len(categories) != 1 {
		t.Errorf("Ожидалась 1 категория, получено %d", len(categories))
	}
	if categories[0].Name != "Хобби" {
		t.Errorf("Ожидалось Name='Хобби', получено '%s'", categories[0].Name)
	}
}

func TestUpdateCategory(t *testing.T) {
	repo := NewMockCategoryRepo()
	service := NewService(repo)
	ctx := context.Background()

	// Создаем категорию
	category, _ := service.CreateCategory(ctx, 1, "Работа", "#ff0000")
	originalID := category.ID

	// Обновляем категорию
	updatedCategory, err := service.UpdateCategory(ctx, originalID, 1, "Работа (обновлено)", "#00ff00")
	if err != nil {
		t.Errorf("Ошибка при обновлении категории: %v", err)
	}

	// Проверяем, что обновились нужные поля
	if updatedCategory.Name != "Работа (обновлено)" {
		t.Errorf("Ожидалось Name='Работа (обновлено)', получено '%s'", updatedCategory.Name)
	}
	if updatedCategory.Color != "#00ff00" {
		t.Errorf("Ожидалось Color='#00ff00', получено '%s'", updatedCategory.Color)
	}

	// Проверяем, что ID не изменился
	if updatedCategory.ID != originalID {
		t.Errorf("ID категории изменился с %d на %d", originalID, updatedCategory.ID)
	}

	// Попытка обновить несуществующую категорию
	_, err = service.UpdateCategory(ctx, 999, 1, "Несуществующая", "#000000")
	if err == nil {
		t.Error("Ожидалась ошибка при обновлении несуществующей категории")
	}

	// Попытка обновить категорию другого пользователя
	_, err = service.UpdateCategory(ctx, originalID, 2, "Чужая категория", "#000000")
	if err == nil {
		t.Error("Ожидалась ошибка при обновлении чужой категории")
	}
}

func TestDeleteCategory(t *testing.T) {
	repo := NewMockCategoryRepo()
	service := NewService(repo)
	ctx := context.Background()

	// Создаем категорию
	category, _ := service.CreateCategory(ctx, 1, "Работа", "#ff0000")
	categoryID := category.ID

	// Удаляем категорию
	err := service.DeleteCategory(ctx, categoryID, 1)
	if err != nil {
		t.Errorf("Ошибка при удалении категории: %v", err)
	}

	// Проверяем, что категория удалена (получение должно вернуть ошибку)
	_, err = repo.GetCategoryByID(ctx, categoryID)
	if err == nil {
		t.Error("Категория не была удалена")
	}

	// Попытка удалить несуществующую категорию
	err = service.DeleteCategory(ctx, 999, 1)
	if err == nil {
		t.Error("Ожидалась ошибка при удалении несуществующей категории")
	}

	// Создаем новую категорию для проверки прав доступа
	category, _ = service.CreateCategory(ctx, 1, "Еще категория", "#ff0000")
	categoryID = category.ID

	// Попытка удалить категорию другим пользователем
	err = service.DeleteCategory(ctx, categoryID, 2)
	if err == nil {
		t.Error("Ожидалась ошибка при удалении чужой категории")
	}
}
