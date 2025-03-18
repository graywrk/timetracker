package models

import (
	"testing"
	"time"
)

func TestTimeEntry_CalculateDuration(t *testing.T) {
	// Устанавливаем базовое время для тестов
	baseTime := time.Date(2023, 1, 1, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		name             string
		entry            TimeEntry
		mockNow          time.Time
		expectedDuration int64
	}{
		{
			name: "Завершенная запись без пауз",
			entry: TimeEntry{
				StartTime:   baseTime,
				EndTime:     baseTime.Add(2 * time.Hour),
				Status:      StatusCompleted,
				TotalPaused: 0,
			},
			expectedDuration: 7200, // 2 часа в секундах
		},
		{
			name: "Завершенная запись с паузами",
			entry: TimeEntry{
				StartTime:   baseTime,
				EndTime:     baseTime.Add(3 * time.Hour),
				Status:      StatusCompleted,
				TotalPaused: 1800, // 30 минут в секундах
			},
			expectedDuration: 9000, // 3 часа - 30 минут = 2.5 часа в секундах
		},
		{
			name: "Активная запись без пауз",
			entry: TimeEntry{
				StartTime:   baseTime,
				Status:      StatusActive,
				TotalPaused: 0,
			},
			mockNow:          baseTime.Add(1 * time.Hour),
			expectedDuration: 3600, // 1 час в секундах
		},
		{
			name: "Приостановленная запись",
			entry: TimeEntry{
				StartTime:   baseTime,
				Status:      StatusPaused,
				PausedAt:    baseTime.Add(45 * time.Minute),
				TotalPaused: 0,
			},
			expectedDuration: 2700, // 45 минут в секундах
		},
		{
			name: "Активная запись с прошлыми паузами",
			entry: TimeEntry{
				StartTime:   baseTime,
				Status:      StatusActive,
				TotalPaused: 600, // 10 минут в секундах
			},
			mockNow:          baseTime.Add(90 * time.Minute),
			expectedDuration: 4800, // 90 минут - 10 минут = 80 минут в секундах
		},
	}

	// Сохраняем оригинальную функцию time.Now
	originalTimeNow := timeNow
	defer func() { timeNow = originalTimeNow }()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Если тест предоставляет mockNow, устанавливаем ее
			if !tt.mockNow.IsZero() {
				timeNow = func() time.Time {
					return tt.mockNow
				}
			} else {
				// Иначе возвращаем стандартную функцию
				timeNow = originalTimeNow
			}

			duration := tt.entry.CalculateDuration()
			if duration != tt.expectedDuration {
				t.Errorf("CalculateDuration() = %v, хотели %v", duration, tt.expectedDuration)
			}
		})
	}
}
