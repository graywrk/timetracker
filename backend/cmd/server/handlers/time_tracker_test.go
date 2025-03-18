package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/timetracker"
)

// MockRepository представляет мок репозитория для тестирования
type MockRepository struct {
	entries    map[uint]*models.TimeEntry
	categories map[uint]*models.Category
	err        error
}

// NewMockRepository создает новый мок репозитория
func NewMockRepository() *MockRepository {
	return &MockRepository{
		entries:    make(map[uint]*models.TimeEntry),
		categories: make(map[uint]*models.Category),
	}
}

// SetError устанавливает ошибку для возврата из методов репозитория
func (m *MockRepository) SetError(err error) {
	m.err = err
}

// Методы для работы с пользователями
func (m *MockRepository) CreateUser(ctx context.Context, user *models.User) error {
	return m.err
}

func (m *MockRepository) GetUserByID(ctx context.Context, id uint) (*models.User, error) {
	return nil, m.err
}

func (m *MockRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return nil, m.err
}

func (m *MockRepository) UpdateUser(ctx context.Context, user *models.User) error {
	return m.err
}

func (m *MockRepository) DeleteUser(ctx context.Context, id uint) error {
	return m.err
}

// Методы для работы с записями о времени
func (m *MockRepository) CreateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	if m.err != nil {
		return m.err
	}
	m.entries[entry.ID] = entry
	return nil
}

func (m *MockRepository) GetTimeEntryByID(ctx context.Context, id uint) (*models.TimeEntry, error) {
	if m.err != nil {
		return nil, m.err
	}
	entry, ok := m.entries[id]
	if !ok {
		return nil, errors.New("запись не найдена")
	}
	return entry, nil
}

func (m *MockRepository) GetTimeEntriesByUserID(ctx context.Context, userID uint) ([]*models.TimeEntry, error) {
	if m.err != nil {
		return nil, m.err
	}
	var entries []*models.TimeEntry
	for _, entry := range m.entries {
		if entry.UserID == userID {
			entries = append(entries, entry)
		}
	}
	return entries, nil
}

func (m *MockRepository) GetActiveTimeEntryForUser(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	if m.err != nil {
		return nil, m.err
	}
	for _, entry := range m.entries {
		if entry.UserID == userID && entry.Status == models.StatusActive {
			return entry, nil
		}
	}
	return nil, nil
}

func (m *MockRepository) UpdateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	if m.err != nil {
		return m.err
	}
	m.entries[entry.ID] = entry
	return nil
}

func (m *MockRepository) DeleteTimeEntry(ctx context.Context, id uint) error {
	if m.err != nil {
		return m.err
	}
	delete(m.entries, id)
	return nil
}

func (m *MockRepository) GetUserStatsByPeriod(ctx context.Context, userID uint, startDate, endDate string) ([]*models.TimeEntry, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.GetTimeEntriesByUserID(ctx, userID)
}

// Методы для работы с категориями
func (m *MockRepository) CreateCategory(ctx context.Context, category *models.Category) error {
	if m.err != nil {
		return m.err
	}
	m.categories[category.ID] = category
	return nil
}

func (m *MockRepository) GetCategoryByID(ctx context.Context, id uint) (*models.Category, error) {
	if m.err != nil {
		return nil, m.err
	}
	category, ok := m.categories[id]
	if !ok {
		return nil, errors.New("категория не найдена")
	}
	return category, nil
}

func (m *MockRepository) GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error) {
	if m.err != nil {
		return nil, m.err
	}
	var categories []*models.Category
	for _, category := range m.categories {
		if category.UserID == userID {
			categories = append(categories, category)
		}
	}
	return categories, nil
}

func (m *MockRepository) UpdateCategory(ctx context.Context, category *models.Category) error {
	if m.err != nil {
		return m.err
	}
	m.categories[category.ID] = category
	return nil
}

func (m *MockRepository) DeleteCategory(ctx context.Context, id uint) error {
	if m.err != nil {
		return m.err
	}
	delete(m.categories, id)
	return nil
}

// TestDeleteTimeEntry тестирует обработчик удаления записи о времени
func TestDeleteTimeEntry(t *testing.T) {
	// Создаем мок репозитория
	mockRepo := NewMockRepository()

	// Создаем сервис с моком репозитория
	service := timetracker.NewService(mockRepo)

	// Создаем обработчик
	handler := NewTimeTrackerHandler(service)

	// Тест 1: Успешное удаление
	t.Run("Success", func(t *testing.T) {
		// Создаем тестовую запись
		entry := &models.TimeEntry{
			ID:     1,
			UserID: 1,
			Status: models.StatusCompleted,
		}

		// Добавляем запись в репозиторий
		mockRepo.entries[entry.ID] = entry

		// Создаем запрос
		reqBody := `{"entry_id": 1}`
		req, err := http.NewRequest("POST", "/api/time/delete", strings.NewReader(reqBody))
		if err != nil {
			t.Fatal(err)
		}

		// Устанавливаем пользователя в контекст
		ctx := context.WithValue(req.Context(), "user_id", uint(1))
		req = req.WithContext(ctx)

		// Создаем ResponseRecorder для записи ответа
		rr := httptest.NewRecorder()

		// Вызываем обработчик
		handler.DeleteTimeEntry(rr, req)

		// Проверяем статус-код
		if status := rr.Code; status != http.StatusOK {
			t.Errorf("ожидался статус %v, получен %v", http.StatusOK, status)
		}

		// Проверяем, что запись удалена
		if _, ok := mockRepo.entries[entry.ID]; ok {
			t.Error("запись не была удалена")
		}
	})

	// Тест 2: Ошибка при удалении чужой записи
	t.Run("NotAuthorized", func(t *testing.T) {
		// Создаем тестовую запись
		entry := &models.TimeEntry{
			ID:     2,
			UserID: 2, // Другой пользователь
			Status: models.StatusCompleted,
		}

		// Добавляем запись в репозиторий
		mockRepo.entries[entry.ID] = entry

		// Создаем запрос
		reqBody := `{"entry_id": 2}`
		req, err := http.NewRequest("POST", "/api/time/delete", strings.NewReader(reqBody))
		if err != nil {
			t.Fatal(err)
		}

		// Устанавливаем пользователя в контекст
		ctx := context.WithValue(req.Context(), "user_id", uint(1))
		req = req.WithContext(ctx)

		// Создаем ResponseRecorder для записи ответа
		rr := httptest.NewRecorder()

		// Вызываем обработчик
		handler.DeleteTimeEntry(rr, req)

		// Проверяем статус-код
		if status := rr.Code; status != http.StatusForbidden {
			t.Errorf("ожидался статус %v, получен %v", http.StatusForbidden, status)
		}

		// Проверяем, что запись не удалена
		if _, ok := mockRepo.entries[entry.ID]; !ok {
			t.Error("запись была удалена, хотя не должна была")
		}
	})

	// Тест 3: Ошибка при удалении несуществующей записи
	t.Run("NotFound", func(t *testing.T) {
		// Создаем запрос
		reqBody := `{"entry_id": 3}`
		req, err := http.NewRequest("POST", "/api/time/delete", strings.NewReader(reqBody))
		if err != nil {
			t.Fatal(err)
		}

		// Устанавливаем пользователя в контекст
		ctx := context.WithValue(req.Context(), "user_id", uint(1))
		req = req.WithContext(ctx)

		// Создаем ResponseRecorder для записи ответа
		rr := httptest.NewRecorder()

		// Вызываем обработчик
		handler.DeleteTimeEntry(rr, req)

		// Проверяем статус-код
		if status := rr.Code; status != http.StatusNotFound {
			t.Errorf("ожидался статус %v, получен %v", http.StatusNotFound, status)
		}
	})
}
