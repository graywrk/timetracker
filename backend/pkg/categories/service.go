package categories

import (
	"context"
	"errors"
	"fmt"

	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/database"
)

// Определение типовых ошибок
var (
	ErrCategoryNotFound  = errors.New("категория не найдена")
	ErrNotAuthorized     = errors.New("у пользователя нет прав на эту категорию")
	ErrEmptyCategoryName = errors.New("название категории не может быть пустым")
)

// Service предоставляет методы для работы с категориями
type Service struct {
	repo database.Repository
}

// NewService создает новый сервис категорий
func NewService(repo database.Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// CreateCategory создает новую категорию для пользователя
func (s *Service) CreateCategory(ctx context.Context, userID uint, name, color string) (*models.Category, error) {
	if name == "" {
		return nil, fmt.Errorf("название категории не может быть пустым")
	}

	if color == "" {
		color = "#4a6bff" // Цвет по умолчанию
	}

	category := &models.Category{
		UserID: userID,
		Name:   name,
		Color:  color,
	}

	if err := s.repo.CreateCategory(ctx, category); err != nil {
		return nil, fmt.Errorf("ошибка при создании категории: %w", err)
	}

	return category, nil
}

// GetCategoriesByUserID возвращает все категории пользователя
func (s *Service) GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error) {
	categories, err := s.repo.GetCategoriesByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении категорий пользователя: %w", err)
	}
	return categories, nil
}

// GetCategoryByID возвращает категорию по ID
func (s *Service) GetCategoryByID(ctx context.Context, id uint) (*models.Category, error) {
	category, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении категории: %w", err)
	}
	return category, nil
}

// UpdateCategory обновляет существующую категорию
func (s *Service) UpdateCategory(ctx context.Context, id, userID uint, name, color string) (*models.Category, error) {
	// Проверяем наличие категории и права доступа
	existingCategory, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении категории: %w", err)
	}

	if existingCategory.UserID != userID {
		return nil, fmt.Errorf("у пользователя нет прав на редактирование этой категории")
	}

	if name == "" {
		return nil, fmt.Errorf("название категории не может быть пустым")
	}

	if color == "" {
		color = existingCategory.Color // Оставляем текущий цвет
	}

	// Обновляем категорию
	category := &models.Category{
		ID:     id,
		UserID: userID,
		Name:   name,
		Color:  color,
	}

	if err := s.repo.UpdateCategory(ctx, category); err != nil {
		return nil, fmt.Errorf("ошибка при обновлении категории: %w", err)
	}

	return category, nil
}

// DeleteCategory удаляет категорию
func (s *Service) DeleteCategory(ctx context.Context, id, userID uint) error {
	// Проверяем наличие категории и права доступа
	existingCategory, err := s.repo.GetCategoryByID(ctx, id)
	if err != nil {
		return fmt.Errorf("ошибка при получении категории: %w", err)
	}

	if existingCategory.UserID != userID {
		return fmt.Errorf("у пользователя нет прав на удаление этой категории")
	}

	// Удаляем категорию
	if err := s.repo.DeleteCategory(ctx, id); err != nil {
		return fmt.Errorf("ошибка при удалении категории: %w", err)
	}

	return nil
}
