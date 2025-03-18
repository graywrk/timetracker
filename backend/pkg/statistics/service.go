package statistics

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/database"
)

// Service предоставляет методы для работы со статистикой
type Service struct {
	repo database.Repository
}

// NewService создает новый сервис статистики
func NewService(repo database.Repository) *Service {
	return &Service{
		repo: repo,
	}
}

// TimeStats содержит статистику по времени
type TimeStats struct {
	TotalDuration      int64               `json:"total_duration"`      // в секундах
	DailyStats         map[string]int64    `json:"daily_stats"`         // день -> длительность в секундах
	AverageDailyHours  float64             `json:"average_daily_hours"` // среднее количество часов в день
	LongestSessionDate string              `json:"longest_session_date"`
	LongestSession     int64               `json:"longest_session"`        // в секундах
	Entries            []*models.TimeEntry `json:"entries"`                // все записи за период
	ActiveEntry        *models.TimeEntry   `json:"active_entry,omitempty"` // текущая активная запись
}

// GetUserStats возвращает статистику по пользователю за указанный период
func (s *Service) GetUserStats(ctx context.Context, userID uint, startDate, endDate string) (*TimeStats, error) {
	log.Printf("Service.GetUserStats: Запрос статистики для userID=%d, startDate=%s, endDate=%s", userID, startDate, endDate)

	// Получаем записи за указанный период
	entries, err := s.repo.GetUserStatsByPeriod(ctx, userID, startDate, endDate)
	if err != nil {
		log.Printf("Service.GetUserStats: Ошибка получения записей: %v", err)
		return nil, err
	}

	log.Printf("Service.GetUserStats: Получено %d записей из репозитория", len(entries))

	// Детальное логирование каждой полученной записи
	for i, entry := range entries {
		log.Printf("Service.GetUserStats: Запись %d/%d: ID=%d, start_time=%v, end_time=%v, status=%s",
			i+1, len(entries), entry.ID, entry.StartTime, entry.EndTime, entry.Status)
	}

	// Получаем активную запись
	activeEntry, err := s.repo.GetActiveTimeEntryForUser(ctx, userID)
	if err != nil {
		log.Printf("Service.GetUserStats: Ошибка получения активной записи: %v", err)
		return nil, err
	}

	if activeEntry != nil {
		log.Printf("Service.GetUserStats: Найдена активная запись с ID=%d, статус=%s", activeEntry.ID, activeEntry.Status)
	} else {
		log.Printf("Service.GetUserStats: Активная запись не найдена")
	}

	// Подготавливаем статистику
	stats := &TimeStats{
		DailyStats:  make(map[string]int64),
		Entries:     entries,
		ActiveEntry: activeEntry,
	}

	// Если нет записей, возвращаем пустую статистику
	if len(entries) == 0 {
		log.Printf("Service.GetUserStats: Нет записей за указанный период, возвращаем пустую статистику")
		return stats, nil
	}

	log.Printf("Service.GetUserStats: Обрабатываем %d записей для статистики", len(entries))

	var totalDuration int64
	var longestSession int64
	var longestSessionDate string

	// Обрабатываем каждую запись для подсчета статистики
	for _, entry := range entries {
		log.Printf("Service.GetUserStats: Обработка записи ID=%d, status=%s, start_time=%v, end_time=%v",
			entry.ID, entry.Status, entry.StartTime, entry.EndTime)

		duration := entry.CalculateDuration()
		log.Printf("Service.GetUserStats: Запись ID=%d имеет продолжительность %d секунд", entry.ID, duration)
		totalDuration += duration

		// Добавляем в дневную статистику
		day := entry.StartTime.Format("2006-01-02")
		stats.DailyStats[day] += duration
		log.Printf("Service.GetUserStats: Добавлено %d секунд к дню %s, всего за день: %d",
			duration, day, stats.DailyStats[day])

		// Проверяем, является ли это самой длинной сессией
		if duration > longestSession {
			longestSession = duration
			longestSessionDate = day
			log.Printf("Service.GetUserStats: Новая самая длинная сессия: %d сек, дата: %s",
				longestSession, longestSessionDate)
		}
	}

	stats.TotalDuration = totalDuration
	stats.LongestSession = longestSession
	stats.LongestSessionDate = longestSessionDate

	log.Printf("Service.GetUserStats: Итоговая статистика: totalDuration=%d, записей=%d, дней=%d",
		stats.TotalDuration, len(stats.Entries), len(stats.DailyStats))

	// Рассчитываем среднее количество часов в день
	if len(stats.DailyStats) > 0 {
		totalHours := float64(totalDuration) / 3600.0 // Переводим секунды в часы
		stats.AverageDailyHours = totalHours / float64(len(stats.DailyStats))
		log.Printf("Service.GetUserStats: Среднее количество часов в день: %.2f", stats.AverageDailyHours)
	}

	// Проверяем финальное состояние объекта перед возвратом
	log.Printf("Service.GetUserStats: Возвращаемый объект - entries:%d, totalDuration:%d, dailyStats:%v",
		len(stats.Entries), stats.TotalDuration, stats.DailyStats)

	// Для отладки логируем всю структуру
	jsonData, err := json.Marshal(stats)
	if err != nil {
		log.Printf("Service.GetUserStats: Не удалось сериализовать статистику в JSON: %v", err)
	} else {
		log.Printf("Service.GetUserStats: Итоговый JSON: %s", string(jsonData))
	}

	return stats, nil
}

// GetWeeklyStats возвращает статистику за последнюю неделю
func (s *Service) GetWeeklyStats(ctx context.Context, userID uint) (*TimeStats, error) {
	now := time.Now()
	endDate := now.Format("2006-01-02")
	startDate := now.AddDate(0, 0, -7).Format("2006-01-02")

	return s.GetUserStats(ctx, userID, startDate, endDate)
}

// GetMonthlyStats возвращает статистику за последний месяц
func (s *Service) GetMonthlyStats(ctx context.Context, userID uint) (*TimeStats, error) {
	now := time.Now()
	endDate := now.Format("2006-01-02")
	startDate := now.AddDate(0, -1, 0).Format("2006-01-02")

	return s.GetUserStats(ctx, userID, startDate, endDate)
}

// FormatDuration форматирует продолжительность в человекочитаемый формат (ЧЧ:ММ:СС)
func FormatDuration(seconds int64) string {
	// Используем time.Duration для форматирования
	return time.Time{}.Add(time.Duration(seconds) * time.Second).Format("15:04:05")
}
