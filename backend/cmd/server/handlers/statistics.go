package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/graywrk/timetracker/backend/pkg/statistics"
)

// StatisticsHandler обрабатывает запросы статистики
type StatisticsHandler struct {
	statsService *statistics.Service
}

// NewStatisticsHandler создает новый обработчик статистики
func NewStatisticsHandler(statsService *statistics.Service) *StatisticsHandler {
	return &StatisticsHandler{
		statsService: statsService,
	}
}

// GetCurrentWeekStats возвращает статистику за текущую неделю
func (h *StatisticsHandler) GetCurrentWeekStats(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	// Получаем статистику
	stats, err := h.statsService.GetWeeklyStats(r.Context(), userID)
	if err != nil {
		http.Error(w, "Ошибка при получении статистики: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GetCurrentMonthStats возвращает статистику за текущий месяц
func (h *StatisticsHandler) GetCurrentMonthStats(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	// Получаем статистику
	stats, err := h.statsService.GetMonthlyStats(r.Context(), userID)
	if err != nil {
		http.Error(w, "Ошибка при получении статистики: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// GetCustomStats возвращает статистику за произвольный период
func (h *StatisticsHandler) GetCustomStats(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		log.Printf("GetCustomStats: Ошибка получения user_id из контекста")
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	log.Printf("GetCustomStats: Получен запрос статистики для пользователя %d", userID)

	// Получаем параметры запроса
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	if startDate == "" || endDate == "" {
		log.Printf("GetCustomStats: Отсутствуют обязательные параметры start_date или end_date")
		http.Error(w, "Необходимо указать start_date и end_date", http.StatusBadRequest)
		return
	}

	log.Printf("GetCustomStats: Запрос статистики с параметрами startDate=%s, endDate=%s", startDate, endDate)

	// Получаем статистику из сервиса
	stats, err := h.statsService.GetUserStats(r.Context(), userID, startDate, endDate)
	if err != nil {
		log.Printf("GetCustomStats: Ошибка получения статистики: %v", err)
		http.Error(w, "Ошибка получения статистики", http.StatusInternalServerError)
		return
	}

	log.Printf("GetCustomStats: Получена статистика: записей=%d, общая продолжительность=%d",
		len(stats.Entries), stats.TotalDuration)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}
