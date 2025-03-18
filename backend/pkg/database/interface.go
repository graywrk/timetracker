package database

import (
	"context"

	"github.com/graywrk/timetracker/backend/internal/models"
)

// Repository представляет интерфейс для работы с базой данных
type Repository interface {
	// Методы для работы с пользователями
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByID(ctx context.Context, id uint) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	DeleteUser(ctx context.Context, id uint) error

	// Методы для работы с записями о времени
	CreateTimeEntry(ctx context.Context, entry *models.TimeEntry) error
	GetTimeEntryByID(ctx context.Context, id uint) (*models.TimeEntry, error)
	GetTimeEntriesByUserID(ctx context.Context, userID uint) ([]*models.TimeEntry, error)
	GetActiveTimeEntryForUser(ctx context.Context, userID uint) (*models.TimeEntry, error)
	UpdateTimeEntry(ctx context.Context, entry *models.TimeEntry) error
	DeleteTimeEntry(ctx context.Context, id uint) error

	// Методы для статистики
	GetUserStatsByPeriod(ctx context.Context, userID uint, startDate, endDate string) ([]*models.TimeEntry, error)

	// Методы для работы с категориями
	CreateCategory(ctx context.Context, category *models.Category) error
	GetCategoryByID(ctx context.Context, id uint) (*models.Category, error)
	GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error)
	UpdateCategory(ctx context.Context, category *models.Category) error
	DeleteCategory(ctx context.Context, id uint) error
}
