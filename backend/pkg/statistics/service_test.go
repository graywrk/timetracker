package statistics

import (
	"context"
	"testing"
	"time"

	"github.com/graywrk/timetracker/backend/internal/models"
)

// MockRepository представляет мок репозитория для тестирования
type MockRepository struct {
	entries     []*models.TimeEntry
	activeEntry *models.TimeEntry
	err         error
}

// NewMockRepository создает новый мок репозитория
func NewMockRepository() *MockRepository {
	return &MockRepository{
		entries: make([]*models.TimeEntry, 0),
	}
}

// SetError устанавливает ошибку, которая будет возвращаться методами мока
func (m *MockRepository) SetError(err error) {
	m.err = err
}

// SetEntries устанавливает записи, которые будут возвращаться методом GetUserStatsByPeriod
func (m *MockRepository) SetEntries(entries []*models.TimeEntry) {
	m.entries = entries
}

// SetActiveEntry устанавливает активную запись, которая будет возвращаться методом GetActiveTimeEntryForUser
func (m *MockRepository) SetActiveEntry(entry *models.TimeEntry) {
	m.activeEntry = entry
}

// Реализация методов интерфейса Repository

// CreateUser мок метода
func (m *MockRepository) CreateUser(ctx context.Context, user *models.User) error {
	return m.err
}

// GetUserByID мок метода
func (m *MockRepository) GetUserByID(ctx context.Context, id uint) (*models.User, error) {
	return nil, m.err
}

// GetUserByEmail мок метода
func (m *MockRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return nil, m.err
}

// UpdateUser мок метода
func (m *MockRepository) UpdateUser(ctx context.Context, user *models.User) error {
	return m.err
}

// DeleteUser мок метода
func (m *MockRepository) DeleteUser(ctx context.Context, id uint) error {
	return m.err
}

// CreateTimeEntry мок метода
func (m *MockRepository) CreateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	return m.err
}

// GetTimeEntryByID мок метода
func (m *MockRepository) GetTimeEntryByID(ctx context.Context, id uint) (*models.TimeEntry, error) {
	return nil, m.err
}

// GetTimeEntriesByUserID мок метода
func (m *MockRepository) GetTimeEntriesByUserID(ctx context.Context, userID uint) ([]*models.TimeEntry, error) {
	return m.entries, m.err
}

// GetActiveTimeEntryForUser мок метода
func (m *MockRepository) GetActiveTimeEntryForUser(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	return m.activeEntry, m.err
}

// UpdateTimeEntry мок метода
func (m *MockRepository) UpdateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	return m.err
}

// DeleteTimeEntry мок метода
func (m *MockRepository) DeleteTimeEntry(ctx context.Context, id uint) error {
	return m.err
}

// GetUserStatsByPeriod мок метода
func (m *MockRepository) GetUserStatsByPeriod(ctx context.Context, userID uint, startDate, endDate string) ([]*models.TimeEntry, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.entries, nil
}

// Методы для работы с категориями
func (m *MockRepository) CreateCategory(ctx context.Context, category *models.Category) error {
	return m.err
}

func (m *MockRepository) GetCategoryByID(ctx context.Context, id uint) (*models.Category, error) {
	return nil, m.err
}

func (m *MockRepository) GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error) {
	return nil, m.err
}

func (m *MockRepository) UpdateCategory(ctx context.Context, category *models.Category) error {
	return m.err
}

func (m *MockRepository) DeleteCategory(ctx context.Context, id uint) error {
	return m.err
}

// TestGetUserStats_CurrentDay тестирует функцию GetUserStats для текущего дня
func TestGetUserStats_CurrentDay(t *testing.T) {
	mockRepo := NewMockRepository()
	service := NewService(mockRepo)
	ctx := context.Background()
	userID := uint(1)

	// Создаем тестовые данные для текущего дня
	now := time.Now()
	nowStr := now.Format("2006-01-02")

	// Запись, завершенная сегодня (2 часа)
	completedEntry := &models.TimeEntry{
		ID:          1,
		UserID:      userID,
		StartTime:   now.Add(-2 * time.Hour),
		EndTime:     now,
		Status:      "completed",
		TotalPaused: 0,
	}

	// Активная запись (30 минут)
	activeEntry := &models.TimeEntry{
		ID:          2,
		UserID:      userID,
		StartTime:   now.Add(-30 * time.Minute),
		Status:      "active",
		TotalPaused: 0,
	}

	// Устанавливаем данные в мок
	mockRepo.SetEntries([]*models.TimeEntry{completedEntry, activeEntry})
	mockRepo.SetActiveEntry(activeEntry)

	// Вызываем тестируемую функцию для текущего дня
	stats, err := service.GetUserStats(ctx, userID, nowStr, nowStr)
	if err != nil {
		t.Fatalf("GetUserStats() error = %v", err)
	}

	// Проверяем результаты
	if stats == nil {
		t.Fatal("GetUserStats() вернул nil")
	}

	// Проверяем общую продолжительность (2 часа + 30 минут = 2.5 часа = 9000 секунд)
	expectedTotalDuration := int64(9000)
	if stats.TotalDuration != expectedTotalDuration {
		t.Errorf("GetUserStats().TotalDuration = %v, хотели %v", stats.TotalDuration, expectedTotalDuration)
	}

	// Проверяем статистику по дням
	if len(stats.DailyStats) != 1 {
		t.Errorf("GetUserStats().DailyStats содержит %v дней, хотели 1", len(stats.DailyStats))
	}

	// Проверяем продолжительность за сегодня (2.5 часа = 9000 секунд)
	if stats.DailyStats[nowStr] != 9000 {
		t.Errorf("GetUserStats().DailyStats[%v] = %v, хотели 9000", nowStr, stats.DailyStats[nowStr])
	}
}

// TestGetUserStats_CustomPeriod тестирует функцию GetUserStats для произвольного периода
func TestGetUserStats_CustomPeriod(t *testing.T) {
	mockRepo := NewMockRepository()
	service := NewService(mockRepo)
	ctx := context.Background()
	userID := uint(1)

	// Определяем временной период
	startDate := "2025-01-01"
	endDate := "2025-03-31"

	// Создаем тестовые записи для разных дней
	entries := []*models.TimeEntry{
		// Запись за 15 января (2 часа)
		{
			ID:          1,
			UserID:      userID,
			StartTime:   time.Date(2025, 1, 15, 10, 0, 0, 0, time.UTC),
			EndTime:     time.Date(2025, 1, 15, 12, 0, 0, 0, time.UTC),
			Status:      "completed",
			TotalPaused: 0,
		},
		// Запись за 10 февраля (4 часа)
		{
			ID:          2,
			UserID:      userID,
			StartTime:   time.Date(2025, 2, 10, 14, 0, 0, 0, time.UTC),
			EndTime:     time.Date(2025, 2, 10, 18, 0, 0, 0, time.UTC),
			Status:      "completed",
			TotalPaused: 0,
		},
		// Запись за 5 марта (8 часов с 1 часом паузы)
		{
			ID:          3,
			UserID:      userID,
			StartTime:   time.Date(2025, 3, 5, 9, 0, 0, 0, time.UTC),
			EndTime:     time.Date(2025, 3, 5, 17, 0, 0, 0, time.UTC),
			Status:      "completed",
			TotalPaused: 3600, // 1 час паузы
		},
	}

	// Устанавливаем данные в мок
	mockRepo.SetEntries(entries)

	// Вызываем тестируемую функцию
	stats, err := service.GetUserStats(ctx, userID, startDate, endDate)
	if err != nil {
		t.Fatalf("GetUserStats() error = %v", err)
	}

	// Проверяем результаты
	if stats == nil {
		t.Fatal("GetUserStats() вернул nil")
	}

	// Общая продолжительность: 2 ч + 4 ч + (8 ч - 1 ч паузы) = 13 часов = 46800 секунд
	expectedTotalDuration := int64(46800)
	if stats.TotalDuration != expectedTotalDuration {
		t.Errorf("GetUserStats().TotalDuration = %v, хотели %v", stats.TotalDuration, expectedTotalDuration)
	}

	// Проверяем количество дней в статистике
	if len(stats.DailyStats) != 3 {
		t.Errorf("GetUserStats().DailyStats содержит %v дней, хотели 3", len(stats.DailyStats))
	}

	// Проверяем самый длинный сеанс (5 марта - 7 часов с учетом паузы = 25200 секунд)
	expectedLongestSession := int64(25200)
	if stats.LongestSession != expectedLongestSession {
		t.Errorf("GetUserStats().LongestSession = %v, хотели %v", stats.LongestSession, expectedLongestSession)
	}

	// Проверяем дату самого длинного сеанса
	expectedLongestSessionDate := "2025-03-05"
	if stats.LongestSessionDate != expectedLongestSessionDate {
		t.Errorf("GetUserStats().LongestSessionDate = %v, хотели %v", stats.LongestSessionDate, expectedLongestSessionDate)
	}
}
