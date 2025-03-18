package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"log"

	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/timetracker"
)

// TimeTrackerHandler обрабатывает запросы учета времени
type TimeTrackerHandler struct {
	timeService *timetracker.Service
}

// NewTimeTrackerHandler создает новый обработчик учета времени
func NewTimeTrackerHandler(timeService *timetracker.Service) *TimeTrackerHandler {
	return &TimeTrackerHandler{
		timeService: timeService,
	}
}

// TimeEntryResponse представляет ответ с информацией о записи времени
type TimeEntryResponse struct {
	ID          uint   `json:"id"`
	Status      string `json:"status"`
	StartTime   string `json:"start_time"`
	EndTime     string `json:"end_time,omitempty"`
	PausedAt    string `json:"paused_at,omitempty"`
	TotalPaused int64  `json:"total_paused"`
	Duration    int64  `json:"duration"` // Длительность в секундах
}

// Start начинает новую запись времени
func (h *TimeTrackerHandler) Start(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста (установлен middleware)
	userID := r.Context().Value("user_id").(uint)

	// Проверяем, есть ли в запросе ID категории
	var req struct {
		CategoryID uint `json:"category_id"`
	}

	var entry *models.TimeEntry
	var err error

	// Парсим тело запроса, если оно есть
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "Неверный формат запроса", http.StatusBadRequest)
			return
		}

		// Если указан ID категории, используем метод с категорией
		if req.CategoryID > 0 {
			entry, err = h.timeService.StartWorkWithCategory(r.Context(), userID, req.CategoryID)
		} else {
			entry, err = h.timeService.StartWork(r.Context(), userID)
		}
	} else {
		// Если тело запроса пустое, просто начинаем запись без категории
		entry, err = h.timeService.StartWork(r.Context(), userID)
	}

	if err != nil {
		if errors.Is(err, timetracker.ErrActiveEntryExists) {
			http.Error(w, "У вас уже есть активная запись времени", http.StatusConflict)
			return
		}
		log.Printf("Ошибка при начале записи времени: %v", err)
		http.Error(w, "Не удалось начать запись времени", http.StatusInternalServerError)
		return
	}

	// Отправляем ответ с созданной записью
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entry)
}

// Pause обрабатывает запрос на приостановку работы
func (h *TimeTrackerHandler) Pause(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	// Приостанавливаем работу
	entry, err := h.timeService.PauseWork(r.Context(), userID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == timetracker.ErrNoActiveEntry {
			status = http.StatusNotFound
		} else if err == timetracker.ErrEntryAlreadyPaused {
			status = http.StatusConflict
		}
		http.Error(w, err.Error(), status)
		return
	}

	// Преобразуем в ответ
	resp := TimeEntryResponse{
		ID:          entry.ID,
		Status:      string(entry.Status),
		StartTime:   entry.StartTime.Format("2006-01-02T15:04:05Z07:00"),
		PausedAt:    entry.PausedAt.Format("2006-01-02T15:04:05Z07:00"),
		TotalPaused: entry.TotalPaused,
		Duration:    entry.CalculateDuration(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// Resume обрабатывает запрос на возобновление работы
func (h *TimeTrackerHandler) Resume(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	// Возобновляем работу
	entry, err := h.timeService.ResumeWork(r.Context(), userID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == timetracker.ErrNoActiveEntry {
			status = http.StatusNotFound
		} else if err == timetracker.ErrEntryNotPaused {
			status = http.StatusConflict
		}
		http.Error(w, err.Error(), status)
		return
	}

	// Преобразуем в ответ
	resp := TimeEntryResponse{
		ID:          entry.ID,
		Status:      string(entry.Status),
		StartTime:   entry.StartTime.Format("2006-01-02T15:04:05Z07:00"),
		TotalPaused: entry.TotalPaused,
		Duration:    entry.CalculateDuration(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// Stop обрабатывает запрос на завершение работы
func (h *TimeTrackerHandler) Stop(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	// Завершаем работу
	entry, err := h.timeService.StopWork(r.Context(), userID)
	if err != nil {
		status := http.StatusInternalServerError
		if err == timetracker.ErrNoActiveEntry {
			status = http.StatusNotFound
		}
		http.Error(w, err.Error(), status)
		return
	}

	// Преобразуем в ответ
	resp := TimeEntryResponse{
		ID:          entry.ID,
		Status:      string(entry.Status),
		StartTime:   entry.StartTime.Format("2006-01-02T15:04:05Z07:00"),
		EndTime:     entry.EndTime.Format("2006-01-02T15:04:05Z07:00"),
		TotalPaused: entry.TotalPaused,
		Duration:    entry.CalculateDuration(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetCurrentStatus обрабатывает запрос на получение текущего статуса работы
func (h *TimeTrackerHandler) GetCurrentStatus(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	// Получаем активную запись
	entry, err := h.timeService.GetActiveTimeEntry(r.Context(), userID)
	if err != nil {
		http.Error(w, "Ошибка при получении статуса: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if entry == nil {
		// Нет активной записи
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "no_active_entry"}`))
		return
	}

	// Преобразуем в ответ
	resp := TimeEntryResponse{
		ID:          entry.ID,
		Status:      string(entry.Status),
		StartTime:   entry.StartTime.Format("2006-01-02T15:04:05Z07:00"),
		TotalPaused: entry.TotalPaused,
		Duration:    entry.CalculateDuration(),
	}

	if entry.Status == models.StatusPaused {
		resp.PausedAt = entry.PausedAt.Format("2006-01-02T15:04:05Z07:00")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// DeleteTimeEntry обрабатывает запрос на удаление записи о времени
func (h *TimeTrackerHandler) DeleteTimeEntry(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	// Получаем ID записи из параметров запроса
	var requestData struct {
		EntryID uint `json:"entry_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		http.Error(w, "Неверный формат запроса: "+err.Error(), http.StatusBadRequest)
		return
	}

	if requestData.EntryID == 0 {
		http.Error(w, "ID записи не указан", http.StatusBadRequest)
		return
	}

	// Удаляем запись
	err := h.timeService.DeleteTimeEntry(r.Context(), requestData.EntryID, userID)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "запись не найдена" {
			status = http.StatusNotFound
		} else if err.Error() == "у вас нет прав на удаление этой записи" {
			status = http.StatusForbidden
		}
		http.Error(w, err.Error(), status)
		return
	}

	// Возвращаем успешный ответ
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Запись успешно удалена"})
}
