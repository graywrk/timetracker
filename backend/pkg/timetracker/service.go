package timetracker

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/database"
)

var (
	// ErrActiveEntryExists возникает при попытке начать работу, когда уже есть активная запись
	ErrActiveEntryExists = errors.New("у вас уже есть активная запись времени")
	// ErrNoActiveEntry возникает при попытке приостановить или завершить работу, когда нет активной записи
	ErrNoActiveEntry = errors.New("у вас нет активной записи времени")
	// ErrEntryAlreadyPaused возникает при попытке приостановить уже приостановленную запись
	ErrEntryAlreadyPaused = errors.New("запись уже приостановлена")
	// ErrEntryNotPaused возникает при попытке возобновить не приостановленную запись
	ErrEntryNotPaused = errors.New("запись не приостановлена")
)

// Service предоставляет методы для работы с временем
type Service struct {
	repo database.Repository
}

// NewService создает новый сервис учета времени
func NewService(repo database.Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// GetActiveTimeEntry возвращает активную запись времени для пользователя
func (s *Service) GetActiveTimeEntry(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	// Получаем записи времени пользователя
	entries, err := s.repo.GetTimeEntriesByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении записей времени: %w", err)
	}

	// Находим активную запись (статус active или paused)
	for _, e := range entries {
		if e.Status != models.StatusCompleted {
			return e, nil
		}
	}

	// Активная запись не найдена
	return nil, nil
}

// StartWork начинает новую запись о рабочем времени
func (s *Service) StartWork(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	// Проверяем, что у пользователя нет активной записи
	activeEntry, err := s.GetActiveTimeEntry(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при проверке активных записей: %w", err)
	}
	if activeEntry != nil {
		return nil, ErrActiveEntryExists
	}

	// Создаем новую запись
	now := timeNow()
	entry := &models.TimeEntry{
		UserID:    userID,
		StartTime: now,
		Status:    models.StatusActive,
	}

	if err := s.repo.CreateTimeEntry(ctx, entry); err != nil {
		return nil, err
	}

	return entry, nil
}

// StartWorkWithCategory начинает новую запись о рабочем времени с указанной категорией
func (s *Service) StartWorkWithCategory(ctx context.Context, userID, categoryID uint) (*models.TimeEntry, error) {
	// Проверяем, что у пользователя нет активной записи
	activeEntry, err := s.GetActiveTimeEntry(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при проверке активных записей: %w", err)
	}
	if activeEntry != nil {
		return nil, ErrActiveEntryExists
	}

	// Проверяем существование категории и права доступа
	category, err := s.repo.GetCategoryByID(ctx, categoryID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении категории: %w", err)
	}

	if category.UserID != userID {
		return nil, fmt.Errorf("категория не принадлежит пользователю")
	}

	// Создаем новую запись
	now := timeNow()
	entry := &models.TimeEntry{
		UserID:     userID,
		StartTime:  now,
		Status:     models.StatusActive,
		CategoryID: &categoryID,
	}

	if err := s.repo.CreateTimeEntry(ctx, entry); err != nil {
		return nil, err
	}

	// Получаем полную запись с данными категории
	fullEntry, err := s.repo.GetTimeEntryByID(ctx, entry.ID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении созданной записи: %w", err)
	}

	return fullEntry, nil
}

// PauseWork приостанавливает текущую работу
func (s *Service) PauseWork(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	// Получаем записи времени пользователя
	entries, err := s.repo.GetTimeEntriesByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении записей времени: %w", err)
	}

	// Находим активную запись
	var activeEntry *models.TimeEntry
	for _, e := range entries {
		if e.Status == models.StatusActive {
			activeEntry = e
			break
		}
	}

	if activeEntry == nil {
		return nil, ErrNoActiveEntry
	}

	// Проверяем, что запись не приостановлена
	if activeEntry.Status == models.StatusPaused {
		return nil, ErrEntryAlreadyPaused
	}

	// Приостанавливаем запись
	now := timeNow()
	activeEntry.PausedAt = now
	activeEntry.Status = models.StatusPaused

	// Сохраняем изменения
	if err := s.repo.UpdateTimeEntry(ctx, activeEntry); err != nil {
		return nil, err
	}

	return activeEntry, nil
}

// ResumeWork возобновляет приостановленную работу
func (s *Service) ResumeWork(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	// Получаем записи времени пользователя
	entries, err := s.repo.GetTimeEntriesByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении записей времени: %w", err)
	}

	// Находим приостановленную запись
	var pausedEntry *models.TimeEntry
	for _, e := range entries {
		if e.Status == models.StatusPaused {
			pausedEntry = e
			break
		}
	}

	if pausedEntry == nil {
		return nil, ErrNoActiveEntry
	}

	// Проверяем, что запись приостановлена
	if pausedEntry.Status != models.StatusPaused {
		return nil, ErrEntryNotPaused
	}

	// Возобновляем запись
	now := timeNow()
	pauseDuration := now.Sub(pausedEntry.PausedAt).Seconds()
	pausedEntry.TotalPaused += int64(pauseDuration)
	pausedEntry.ResumedAt = now
	pausedEntry.PausedAt = time.Time{} // Сбрасываем время паузы
	pausedEntry.Status = models.StatusActive

	// Сохраняем изменения
	if err := s.repo.UpdateTimeEntry(ctx, pausedEntry); err != nil {
		return nil, err
	}

	return pausedEntry, nil
}

// StopWork завершает текущую работу
func (s *Service) StopWork(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	// Получаем активную запись пользователя
	entry, err := s.repo.GetTimeEntriesByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении записей времени: %w", err)
	}

	// Находим активную запись
	var activeEntry *models.TimeEntry
	for _, e := range entry {
		if e.Status != models.StatusCompleted {
			activeEntry = e
			break
		}
	}

	if activeEntry == nil {
		return nil, ErrNoActiveEntry
	}

	// Завершаем запись
	now := timeNow()

	// Если запись была на паузе, добавляем продолжительность паузы
	if activeEntry.Status == models.StatusPaused {
		pauseDuration := now.Sub(activeEntry.PausedAt).Seconds()
		activeEntry.TotalPaused += int64(pauseDuration)
		activeEntry.PausedAt = time.Time{} // Сбрасываем время паузы
	}

	activeEntry.EndTime = now
	activeEntry.Status = models.StatusCompleted

	// Сохраняем изменения
	if err := s.repo.UpdateTimeEntry(ctx, activeEntry); err != nil {
		return nil, err
	}

	return activeEntry, nil
}

// GetUserStats получает статистику пользователя за указанный период
func (s *Service) GetUserStats(ctx context.Context, userID uint, startDate, endDate string) ([]*models.TimeEntry, error) {
	return s.repo.GetUserStatsByPeriod(ctx, userID, startDate, endDate)
}

// GetTotalWorkDuration вычисляет общее отработанное время за указанный период в секундах
func (s *Service) GetTotalWorkDuration(entries []*models.TimeEntry) int64 {
	var totalDuration int64

	for _, entry := range entries {
		totalDuration += entry.CalculateDuration()
	}

	return totalDuration
}

// DeleteTimeEntry удаляет запись о времени по ID
func (s *Service) DeleteTimeEntry(ctx context.Context, entryID, userID uint) error {
	// Получаем запись по ID
	entry, err := s.repo.GetTimeEntryByID(ctx, entryID)
	if err != nil {
		return err
	}

	// Проверяем, что запись принадлежит пользователю
	if entry == nil {
		return errors.New("запись не найдена")
	}

	if entry.UserID != userID {
		return errors.New("у вас нет прав на удаление этой записи")
	}

	// Удаляем запись
	return s.repo.DeleteTimeEntry(ctx, entryID)
}
