package models

import (
	"log"
	"time"
)

// Переменная для возможности мока в тестах
var timeNow = time.Now

// Status представляет статус записи о времени
type Status string

const (
	// StatusActive означает, что пользователь сейчас работает
	StatusActive Status = "active"
	// StatusPaused означает, что пользователь приостановил работу
	StatusPaused Status = "paused"
	// StatusCompleted означает, что пользователь закончил работу
	StatusCompleted Status = "completed"
)

// TimeEntry представляет одну запись о рабочем времени
type TimeEntry struct {
	ID          uint      `json:"id"`
	UserID      uint      `json:"user_id"`
	StartTime   time.Time `json:"start_time"`
	EndTime     time.Time `json:"end_time,omitempty"`
	PausedAt    time.Time `json:"paused_at,omitempty"`
	ResumedAt   time.Time `json:"resumed_at,omitempty"`
	TotalPaused int64     `json:"total_paused"` // в секундах
	Status      Status    `json:"status"`
	CategoryID  *uint     `json:"category_id,omitempty"`
	Category    *Category `json:"category,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CalculateDuration возвращает общее отработанное время в секундах
func (t *TimeEntry) CalculateDuration() int64 {
	// Отладочное логирование
	log.Printf("CalculateDuration: ID=%d, Status=%s, StartTime=%v, EndTime=%v, TotalPaused=%d",
		t.ID, t.Status, t.StartTime, t.EndTime, t.TotalPaused)

	var endTime time.Time
	if t.EndTime.IsZero() {
		if t.Status == StatusPaused {
			endTime = t.PausedAt
			log.Printf("CalculateDuration: Запись в статусе PAUSED, используем PausedAt=%v", t.PausedAt)
		} else {
			endTime = timeNow()
			log.Printf("CalculateDuration: Запись активна, используем текущее время=%v", endTime)
		}
	} else {
		endTime = t.EndTime
		log.Printf("CalculateDuration: Запись завершена, используем EndTime=%v", t.EndTime)
	}

	totalDuration := endTime.Sub(t.StartTime).Seconds()
	result := int64(totalDuration) - t.TotalPaused

	log.Printf("CalculateDuration: Расчет: %.2f сек - %d сек паузы = %d сек итого",
		totalDuration, t.TotalPaused, result)

	return result
}
