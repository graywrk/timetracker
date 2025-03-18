package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/graywrk/timetracker/backend/pkg/categories"
)

// CategoryRequest представляет запрос на создание/обновление категории
type CategoryRequest struct {
	ID    uint   `json:"id,omitempty"`
	Name  string `json:"name"`
	Color string `json:"color"`
}

// CategoryHandler обрабатывает запросы к API категорий
type CategoryHandler struct {
	service *categories.Service
}

// NewCategoryHandler создает новый обработчик для категорий
func NewCategoryHandler(service *categories.Service) *CategoryHandler {
	return &CategoryHandler{
		service: service,
	}
}

// GetCategories возвращает все категории пользователя
func (h *CategoryHandler) GetCategories(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста (установлен middleware)
	userID := r.Context().Value("user_id").(uint)

	// Получаем категории пользователя
	categoriesList, err := h.service.GetCategoriesByUserID(r.Context(), userID)
	if err != nil {
		log.Printf("Ошибка при получении категорий: %v", err)
		http.Error(w, "Не удалось получить категории", http.StatusInternalServerError)
		return
	}

	// Отправляем ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categoriesList)
}

// CreateCategory создает новую категорию
func (h *CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста (установлен middleware)
	userID := r.Context().Value("user_id").(uint)

	// Парсим запрос
	var req CategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Неверный формат запроса", http.StatusBadRequest)
		return
	}

	// Создаем категорию
	category, err := h.service.CreateCategory(r.Context(), userID, req.Name, req.Color)
	if err != nil {
		log.Printf("Ошибка при создании категории: %v", err)
		http.Error(w, "Не удалось создать категорию", http.StatusInternalServerError)
		return
	}

	// Отправляем ответ
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(category)
}

// UpdateCategory обновляет существующую категорию
func (h *CategoryHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста (установлен middleware)
	userID := r.Context().Value("user_id").(uint)

	// Парсим запрос
	var req CategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Неверный формат запроса", http.StatusBadRequest)
		return
	}

	if req.ID == 0 {
		http.Error(w, "ID категории не указан", http.StatusBadRequest)
		return
	}

	// Обновляем категорию
	category, err := h.service.UpdateCategory(r.Context(), req.ID, userID, req.Name, req.Color)
	if err != nil {
		log.Printf("Ошибка при обновлении категории: %v", err)
		http.Error(w, "Не удалось обновить категорию", http.StatusInternalServerError)
		return
	}

	// Отправляем ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(category)
}

// DeleteCategory удаляет категорию
func (h *CategoryHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста (установлен middleware)
	userID := r.Context().Value("user_id").(uint)

	// Парсим запрос
	var req struct {
		ID uint `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Неверный формат запроса", http.StatusBadRequest)
		return
	}

	if req.ID == 0 {
		http.Error(w, "ID категории не указан", http.StatusBadRequest)
		return
	}

	// Удаляем категорию
	err := h.service.DeleteCategory(r.Context(), req.ID, userID)
	if err != nil {
		log.Printf("Ошибка при удалении категории: %v", err)
		http.Error(w, "Не удалось удалить категорию", http.StatusInternalServerError)
		return
	}

	// Отправляем ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Категория успешно удалена",
	})
}
