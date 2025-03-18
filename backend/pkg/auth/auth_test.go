package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/graywrk/timetracker/backend/internal/models"
)

// MockRepository представляет мок репозитория для тестирования
type MockRepository struct {
	users  map[string]*models.User
	nextID uint
	err    error
}

// NewMockRepository создает новый мок репозитория
func NewMockRepository() *MockRepository {
	return &MockRepository{
		users:  make(map[string]*models.User),
		nextID: 1,
	}
}

// SetError устанавливает ошибку, которая будет возвращаться методами мока
func (m *MockRepository) SetError(err error) {
	m.err = err
}

// CreateUser мок метода
func (m *MockRepository) CreateUser(ctx context.Context, user *models.User) error {
	if m.err != nil {
		return m.err
	}
	user.ID = m.nextID
	m.nextID++
	m.users[user.Email] = user
	return nil
}

// GetUserByID мок метода
func (m *MockRepository) GetUserByID(ctx context.Context, id uint) (*models.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	for _, user := range m.users {
		if user.ID == id {
			return user, nil
		}
	}
	return nil, errors.New("пользователь не найден")
}

// GetUserByEmail мок метода
func (m *MockRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	if m.err != nil {
		return nil, m.err
	}
	user, exists := m.users[email]
	if !exists {
		return nil, errors.New("пользователь не найден")
	}
	return user, nil
}

// UpdateUser мок метода
func (m *MockRepository) UpdateUser(ctx context.Context, user *models.User) error {
	if m.err != nil {
		return m.err
	}
	_, exists := m.users[user.Email]
	if !exists {
		return errors.New("пользователь не найден")
	}
	m.users[user.Email] = user
	return nil
}

// DeleteUser мок метода
func (m *MockRepository) DeleteUser(ctx context.Context, id uint) error {
	if m.err != nil {
		return m.err
	}
	for email, user := range m.users {
		if user.ID == id {
			delete(m.users, email)
			return nil
		}
	}
	return errors.New("пользователь не найден")
}

// Остальные методы интерфейса Repository, которые не используются в тестах

func (m *MockRepository) CreateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	return nil
}

func (m *MockRepository) GetTimeEntryByID(ctx context.Context, id uint) (*models.TimeEntry, error) {
	return nil, nil
}

func (m *MockRepository) GetTimeEntriesByUserID(ctx context.Context, userID uint) ([]*models.TimeEntry, error) {
	return nil, nil
}

func (m *MockRepository) GetActiveTimeEntryForUser(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	return nil, nil
}

func (m *MockRepository) UpdateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	return nil
}

func (m *MockRepository) DeleteTimeEntry(ctx context.Context, id uint) error {
	return nil
}

func (m *MockRepository) GetUserStatsByPeriod(ctx context.Context, userID uint, startDate, endDate string) ([]*models.TimeEntry, error) {
	return nil, nil
}

// Методы для работы с категориями
func (m *MockRepository) CreateCategory(ctx context.Context, category *models.Category) error {
	return nil
}

func (m *MockRepository) GetCategoryByID(ctx context.Context, id uint) (*models.Category, error) {
	return nil, nil
}

func (m *MockRepository) GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error) {
	return nil, nil
}

func (m *MockRepository) UpdateCategory(ctx context.Context, category *models.Category) error {
	return nil
}

func (m *MockRepository) DeleteCategory(ctx context.Context, id uint) error {
	return nil
}

// TestRegister тестирует функцию Register
func TestRegister(t *testing.T) {
	mockRepo := NewMockRepository()
	service := NewService(mockRepo, "test-secret", 24*time.Hour, 30*24*time.Hour)
	ctx := context.Background()

	// Тест 1: Успешная регистрация
	user, err := service.Register(ctx, "test@example.com", "password123")
	if err != nil {
		t.Errorf("Register() error = %v, хотели nil", err)
	}
	if user == nil {
		t.Error("Register() вернул nil, хотели пользователя")
	}
	if user.Email != "test@example.com" {
		t.Errorf("Register() вернул пользователя с email = %v, хотели test@example.com", user.Email)
	}

	// Тест 2: Попытка регистрации с существующим email
	_, err = service.Register(ctx, "test@example.com", "anotherpassword")
	if err != ErrEmailAlreadyExists {
		t.Errorf("Register() error = %v, хотели %v", err, ErrEmailAlreadyExists)
	}

	// Тест 3: Ошибка репозитория
	mockRepo.SetError(errors.New("ошибка базы данных"))
	_, err = service.Register(ctx, "another@example.com", "password123")
	if err == nil {
		t.Error("Register() не вернул ошибку при ошибке репозитория")
	}
}

// TestLogin тестирует функцию Login
func TestLogin(t *testing.T) {
	mockRepo := NewMockRepository()
	service := NewService(mockRepo, "test-secret", 24*time.Hour, 30*24*time.Hour)
	ctx := context.Background()

	// Подготовка: Регистрируем пользователя
	mockRepo.SetError(nil)
	_, err := service.Register(ctx, "test@example.com", "password123")
	if err != nil {
		t.Fatalf("Не удалось зарегистрировать пользователя для теста: %v", err)
	}

	// Тест 1: Успешный вход
	token, err := service.Login(ctx, "test@example.com", "password123")
	if err != nil {
		t.Errorf("Login() error = %v, хотели nil", err)
	}
	if token == "" {
		t.Error("Login() вернул пустой токен")
	}

	// Тест 2: Неверный пароль
	_, err = service.Login(ctx, "test@example.com", "wrongpassword")
	if err != ErrInvalidCredentials {
		t.Errorf("Login() error = %v, хотели %v", err, ErrInvalidCredentials)
	}

	// Тест 3: Несуществующий пользователь
	_, err = service.Login(ctx, "nonexistent@example.com", "password123")
	if err == nil {
		t.Error("Login() не вернул ошибку для несуществующего пользователя")
	}

	// Тест 4: Ошибка репозитория
	mockRepo.SetError(errors.New("ошибка базы данных"))
	_, err = service.Login(ctx, "test@example.com", "password123")
	if err == nil {
		t.Error("Login() не вернул ошибку при ошибке репозитория")
	}
}

// TestValidateToken тестирует функцию ValidateToken
func TestValidateToken(t *testing.T) {
	mockRepo := NewMockRepository()
	service := NewService(mockRepo, "test-secret", 24*time.Hour, 30*24*time.Hour)
	ctx := context.Background()

	// Подготовка: Регистрируем пользователя и получаем токен
	mockRepo.SetError(nil)
	user, err := service.Register(ctx, "test@example.com", "password123")
	if err != nil {
		t.Fatalf("Не удалось зарегистрировать пользователя для теста: %v", err)
	}

	token, err := service.Login(ctx, "test@example.com", "password123")
	if err != nil {
		t.Fatalf("Не удалось войти для теста: %v", err)
	}

	// Тест 1: Валидный токен
	userID, err := service.ValidateToken(token)
	if err != nil {
		t.Errorf("ValidateToken() error = %v, хотели nil", err)
	}
	if userID != user.ID {
		t.Errorf("ValidateToken() вернул userID = %v, хотели %v", userID, user.ID)
	}

	// Тест 2: Невалидный токен
	_, err = service.ValidateToken("invalid-token")
	if err == nil {
		t.Error("ValidateToken() не вернул ошибку для невалидного токена")
	}

	// Тест 3: Токен с неверной подписью
	serviceWithDifferentSecret := NewService(mockRepo, "different-secret", 24*time.Hour, 30*24*time.Hour)
	_, err = serviceWithDifferentSecret.ValidateToken(token)
	if err == nil {
		t.Error("ValidateToken() не вернул ошибку для токена с неверной подписью")
	}
}

// TestChangePassword тестирует функцию ChangePassword
func TestChangePassword(t *testing.T) {
	mockRepo := NewMockRepository()
	service := NewService(mockRepo, "test-secret", 24*time.Hour, 30*24*time.Hour)
	ctx := context.Background()

	// Подготовка: Регистрируем пользователя
	mockRepo.SetError(nil)
	user, err := service.Register(ctx, "test@example.com", "password123")
	if err != nil {
		t.Fatalf("Не удалось зарегистрировать пользователя для теста: %v", err)
	}

	// Тест 1: Успешная смена пароля
	err = service.ChangePassword(ctx, user.ID, "password123", "newpassword123")
	if err != nil {
		t.Errorf("ChangePassword() error = %v, хотели nil", err)
	}

	// Проверяем, что новый пароль работает
	_, err = service.Login(ctx, "test@example.com", "newpassword123")
	if err != nil {
		t.Errorf("Не удалось войти с новым паролем: %v", err)
	}

	// Тест 2: Неверный старый пароль
	err = service.ChangePassword(ctx, user.ID, "wrongpassword", "anotherpassword")
	if err == nil {
		t.Error("ChangePassword() не вернул ошибку при неверном старом пароле")
	}

	// Тест 3: Несуществующий пользователь
	err = service.ChangePassword(ctx, 999, "password123", "newpassword123")
	if err == nil {
		t.Error("ChangePassword() не вернул ошибку для несуществующего пользователя")
	}

	// Тест 4: Ошибка репозитория
	mockRepo.SetError(errors.New("ошибка базы данных"))
	err = service.ChangePassword(ctx, user.ID, "newpassword123", "anotherpassword")
	if err == nil {
		t.Error("ChangePassword() не вернул ошибку при ошибке репозитория")
	}
}
