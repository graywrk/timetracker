package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/categories"
)

// Ключ для userID в контексте
const userIDKey = "user_id"

// CategoryServiceInterface определяет интерфейс для сервиса категорий
type CategoryServiceInterface interface {
	CreateCategory(ctx context.Context, userID uint, name, color string) (*models.Category, error)
	GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error)
	GetCategoryByID(ctx context.Context, id uint) (*models.Category, error)
	UpdateCategory(ctx context.Context, id, userID uint, name, color string) (*models.Category, error)
	DeleteCategory(ctx context.Context, id, userID uint) error
}

// Переопределяем CategoryHandler для тестов, чтобы использовать интерфейс вместо конкретной реализации
type CategoryHandlerTest struct {
	service CategoryServiceInterface
}

// MockCategoryService - реализация интерфейса сервиса категорий для тестирования
type mockCategoryService struct {
	categories map[uint]*models.Category
	nextID     uint
}

func newMockCategoryService() *mockCategoryService {
	return &mockCategoryService{
		categories: make(map[uint]*models.Category),
		nextID:     1,
	}
}

func (m *mockCategoryService) CreateCategory(ctx context.Context, userID uint, name, color string) (*models.Category, error) {
	if name == "" {
		return nil, categories.ErrEmptyCategoryName
	}

	if color == "" {
		color = "#4a6bff" // Цвет по умолчанию
	}

	category := &models.Category{
		ID:        m.nextID,
		UserID:    userID,
		Name:      name,
		Color:     color,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	m.nextID++
	m.categories[category.ID] = category

	return category, nil
}

func (m *mockCategoryService) GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error) {
	var result []*models.Category
	for _, category := range m.categories {
		if category.UserID == userID {
			result = append(result, category)
		}
	}
	return result, nil
}

func (m *mockCategoryService) GetCategoryByID(ctx context.Context, id uint) (*models.Category, error) {
	category, exists := m.categories[id]
	if !exists {
		return nil, categories.ErrCategoryNotFound
	}
	return category, nil
}

func (m *mockCategoryService) UpdateCategory(ctx context.Context, id, userID uint, name, color string) (*models.Category, error) {
	category, exists := m.categories[id]
	if !exists {
		return nil, categories.ErrCategoryNotFound
	}

	if category.UserID != userID {
		return nil, categories.ErrNotAuthorized
	}

	if name == "" {
		return nil, categories.ErrEmptyCategoryName
	}

	if color == "" {
		color = category.Color
	}

	category.Name = name
	category.Color = color
	category.UpdatedAt = time.Now()

	return category, nil
}

func (m *mockCategoryService) DeleteCategory(ctx context.Context, id, userID uint) error {
	category, exists := m.categories[id]
	if !exists {
		return categories.ErrCategoryNotFound
	}

	if category.UserID != userID {
		return categories.ErrNotAuthorized
	}

	delete(m.categories, id)
	return nil
}

// Создаем функцию-обертку для создания CategoryHandler с нашим мок-сервисом
func newMockCategoryHandler() (*CategoryHandlerTest, *mockCategoryService) {
	mockService := newMockCategoryService()
	handler := &CategoryHandlerTest{
		service: mockService,
	}
	return handler, mockService
}

// Реализуем методы CategoryHandler для нашего тестового обработчика

func (h *CategoryHandlerTest) GetCategories(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста
	userID, ok := r.Context().Value(userIDKey).(uint)
	if !ok {
		http.Error(w, "Не удалось получить ID пользователя", http.StatusInternalServerError)
		return
	}

	// Получаем категории пользователя
	categories, err := h.service.GetCategoriesByUserID(r.Context(), userID)
	if err != nil {
		http.Error(w, "Ошибка при получении категорий: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Отправляем ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(categories)
}

func (h *CategoryHandlerTest) CreateCategory(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста
	userID, ok := r.Context().Value(userIDKey).(uint)
	if !ok {
		http.Error(w, "Не удалось получить ID пользователя", http.StatusInternalServerError)
		return
	}

	// Декодируем запрос
	var req CategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Ошибка при декодировании запроса: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Создаем категорию
	category, err := h.service.CreateCategory(r.Context(), userID, req.Name, req.Color)
	if err != nil {
		http.Error(w, "Ошибка при создании категории: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Отправляем ответ
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(category)
}

func (h *CategoryHandlerTest) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста
	userID, ok := r.Context().Value(userIDKey).(uint)
	if !ok {
		http.Error(w, "Не удалось получить ID пользователя", http.StatusInternalServerError)
		return
	}

	// Декодируем запрос
	var req CategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Ошибка при декодировании запроса: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Проверяем ID категории
	if req.ID == 0 {
		http.Error(w, "ID категории не указан", http.StatusBadRequest)
		return
	}

	// Обновляем категорию
	category, err := h.service.UpdateCategory(r.Context(), req.ID, userID, req.Name, req.Color)
	if err != nil {
		http.Error(w, "Ошибка при обновлении категории: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Отправляем ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(category)
}

func (h *CategoryHandlerTest) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста
	userID, ok := r.Context().Value(userIDKey).(uint)
	if !ok {
		http.Error(w, "Не удалось получить ID пользователя", http.StatusInternalServerError)
		return
	}

	// Декодируем запрос
	var req struct {
		ID uint `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Ошибка при декодировании запроса: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Проверяем ID категории
	if req.ID == 0 {
		http.Error(w, "ID категории не указан", http.StatusBadRequest)
		return
	}

	// Удаляем категорию
	err := h.service.DeleteCategory(r.Context(), req.ID, userID)
	if err != nil {
		http.Error(w, "Ошибка при удалении категории: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Отправляем ответ
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Категория успешно удалена"})
}

func TestGetCategories(t *testing.T) {
	handler, mockService := newMockCategoryHandler()

	// Создаем тестовые категории
	mockService.CreateCategory(context.Background(), 1, "Работа", "#ff0000")
	mockService.CreateCategory(context.Background(), 1, "Учеба", "#00ff00")
	mockService.CreateCategory(context.Background(), 2, "Хобби", "#0000ff")

	// Создаем тестовый запрос
	req, err := http.NewRequest("GET", "/api/categories", nil)
	if err != nil {
		t.Fatal(err)
	}

	// Устанавливаем пользователя в контекст
	ctx := context.WithValue(req.Context(), userIDKey, uint(1))
	req = req.WithContext(ctx)

	// Создаем ResponseRecorder для записи ответа
	rr := httptest.NewRecorder()

	// Вызываем обработчик
	handler.GetCategories(rr, req)

	// Проверяем статус-код
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("ожидался статус %v, получен %v", http.StatusOK, status)
	}

	// Проверяем тело ответа
	var categories []*models.Category
	if err := json.Unmarshal(rr.Body.Bytes(), &categories); err != nil {
		t.Errorf("не удалось распарсить JSON: %v", err)
	}

	// Проверяем, что вернулись только категории пользователя с ID=1
	if len(categories) != 2 {
		t.Errorf("ожидалось 2 категории, получено %d", len(categories))
	}

	for _, category := range categories {
		if category.UserID != 1 {
			t.Errorf("ожидался userID=1, получено %d", category.UserID)
		}
	}
}

func TestCreateCategory(t *testing.T) {
	handler, _ := newMockCategoryHandler()

	// Создаем тестовый запрос
	requestBody := CategoryRequest{
		Name:  "Новая категория",
		Color: "#112233",
	}
	body, _ := json.Marshal(requestBody)
	req, err := http.NewRequest("POST", "/api/categories/create", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	// Устанавливаем пользователя в контекст
	ctx := context.WithValue(req.Context(), userIDKey, uint(1))
	req = req.WithContext(ctx)

	// Создаем ResponseRecorder для записи ответа
	rr := httptest.NewRecorder()

	// Вызываем обработчик
	handler.CreateCategory(rr, req)

	// Проверяем статус-код
	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("ожидался статус %v, получен %v", http.StatusCreated, status)
	}

	// Проверяем тело ответа
	var category models.Category
	if err := json.Unmarshal(rr.Body.Bytes(), &category); err != nil {
		t.Errorf("не удалось распарсить JSON: %v", err)
	}

	if category.Name != "Новая категория" {
		t.Errorf("ожидалось название 'Новая категория', получено '%s'", category.Name)
	}
	if category.Color != "#112233" {
		t.Errorf("ожидался цвет '#112233', получено '%s'", category.Color)
	}
	if category.UserID != 1 {
		t.Errorf("ожидался userID=1, получено %d", category.UserID)
	}

	// Проверяем обработку ошибки при пустом названии
	requestBody = CategoryRequest{
		Name:  "",
		Color: "#112233",
	}
	body, _ = json.Marshal(requestBody)
	req, _ = http.NewRequest("POST", "/api/categories/create", bytes.NewBuffer(body))
	req = req.WithContext(ctx)
	rr = httptest.NewRecorder()
	handler.CreateCategory(rr, req)

	// Проверяем статус-код ошибки
	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("ожидался статус %v, получен %v", http.StatusBadRequest, status)
	}
}

func TestUpdateCategory(t *testing.T) {
	handler, mockService := newMockCategoryHandler()

	// Создаем тестовую категорию
	category, _ := mockService.CreateCategory(context.Background(), 1, "Тестовая категория", "#112233")

	// Создаем тестовый запрос на обновление
	requestBody := CategoryRequest{
		ID:    category.ID,
		Name:  "Обновленная категория",
		Color: "#445566",
	}
	body, _ := json.Marshal(requestBody)
	req, err := http.NewRequest("POST", "/api/categories/update", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	// Устанавливаем пользователя в контекст
	ctx := context.WithValue(req.Context(), userIDKey, uint(1))
	req = req.WithContext(ctx)

	// Создаем ResponseRecorder для записи ответа
	rr := httptest.NewRecorder()

	// Вызываем обработчик
	handler.UpdateCategory(rr, req)

	// Проверяем статус-код
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("ожидался статус %v, получен %v", http.StatusOK, status)
	}

	// Проверяем тело ответа
	var updatedCategory models.Category
	if err := json.Unmarshal(rr.Body.Bytes(), &updatedCategory); err != nil {
		t.Errorf("не удалось распарсить JSON: %v", err)
	}

	if updatedCategory.Name != "Обновленная категория" {
		t.Errorf("ожидалось название 'Обновленная категория', получено '%s'", updatedCategory.Name)
	}
	if updatedCategory.Color != "#445566" {
		t.Errorf("ожидался цвет '#445566', получено '%s'", updatedCategory.Color)
	}

	// Проверяем обработку ошибки при отсутствии ID
	requestBody = CategoryRequest{
		Name:  "Без ID",
		Color: "#112233",
	}
	body, _ = json.Marshal(requestBody)
	req, _ = http.NewRequest("POST", "/api/categories/update", bytes.NewBuffer(body))
	req = req.WithContext(ctx)
	rr = httptest.NewRecorder()
	handler.UpdateCategory(rr, req)

	// Проверяем статус-код ошибки
	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("ожидался статус %v, получен %v", http.StatusBadRequest, status)
	}

	// Проверяем обработку ошибки при пустом названии
	requestBody = CategoryRequest{
		ID:    category.ID,
		Name:  "",
		Color: "#112233",
	}
	body, _ = json.Marshal(requestBody)
	req, _ = http.NewRequest("POST", "/api/categories/update", bytes.NewBuffer(body))
	req = req.WithContext(ctx)
	rr = httptest.NewRecorder()
	handler.UpdateCategory(rr, req)

	// Проверяем статус-код ошибки
	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("ожидался статус %v, получен %v", http.StatusBadRequest, status)
	}
}

func TestDeleteCategory(t *testing.T) {
	handler, mockService := newMockCategoryHandler()

	// Создаем тестовую категорию
	category, _ := mockService.CreateCategory(context.Background(), 1, "Категория для удаления", "#112233")

	// Создаем тестовый запрос на удаление
	requestBody := struct {
		ID uint `json:"id"`
	}{
		ID: category.ID,
	}
	body, _ := json.Marshal(requestBody)
	req, err := http.NewRequest("POST", "/api/categories/delete", bytes.NewBuffer(body))
	if err != nil {
		t.Fatal(err)
	}

	// Устанавливаем пользователя в контекст
	ctx := context.WithValue(req.Context(), userIDKey, uint(1))
	req = req.WithContext(ctx)

	// Создаем ResponseRecorder для записи ответа
	rr := httptest.NewRecorder()

	// Вызываем обработчик
	handler.DeleteCategory(rr, req)

	// Проверяем статус-код
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("ожидался статус %v, получен %v", http.StatusOK, status)
	}

	// Проверяем, что категория действительно удалена
	_, err = mockService.GetCategoryByID(context.Background(), category.ID)
	if err == nil {
		t.Error("категория не была удалена")
	}

	// Проверяем обработку ошибки при отсутствии ID
	requestBody = struct {
		ID uint `json:"id"`
	}{
		ID: 0,
	}
	body, _ = json.Marshal(requestBody)
	req, _ = http.NewRequest("POST", "/api/categories/delete", bytes.NewBuffer(body))
	req = req.WithContext(ctx)
	rr = httptest.NewRecorder()
	handler.DeleteCategory(rr, req)

	// Проверяем статус-код ошибки
	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("ожидался статус %v, получен %v", http.StatusBadRequest, status)
	}
}
