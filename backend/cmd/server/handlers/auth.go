package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/auth"
)

// AuthService представляет интерфейс для сервиса аутентификации
type AuthService interface {
	Register(ctx context.Context, email, password string) (*models.User, error)
	Login(ctx context.Context, email, password string) (string, error)
	LoginWithRememberMe(ctx context.Context, email, password string, rememberMe bool) (string, error)
	ValidateToken(tokenString string) (uint, error)
	ChangePassword(ctx context.Context, userID uint, oldPassword, newPassword string) error
}

// AuthHandler обрабатывает запросы аутентификации
type AuthHandler struct {
	authService AuthService
}

// NewAuthHandler создает новый обработчик аутентификации
func NewAuthHandler(authService AuthService) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// RegisterRequest представляет запрос на регистрацию
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginRequest представляет запрос на вход
type LoginRequest struct {
	Email      string `json:"email"`
	Password   string `json:"password"`
	RememberMe bool   `json:"remember_me"`
}

// ChangePasswordRequest представляет запрос на изменение пароля
type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

// TokenResponse представляет ответ с токеном
type TokenResponse struct {
	Token string `json:"token"`
}

// Register обрабатывает запрос на регистрацию пользователя
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	log.Println("Получен запрос на регистрацию")

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Ошибка при разборе JSON: %v", err)
		http.Error(w, "Ошибка при разборе JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("Запрос на регистрацию с email: %s", req.Email)

	// Проверяем, что все обязательные поля заполнены
	if req.Email == "" || req.Password == "" {
		log.Println("Email или пароль не указаны")
		http.Error(w, "Email и пароль обязательны", http.StatusBadRequest)
		return
	}

	// Регистрируем пользователя
	log.Println("Вызываем метод Register сервиса аутентификации")
	_, err := h.authService.Register(r.Context(), req.Email, req.Password)
	if err != nil {
		log.Printf("Ошибка при регистрации: %v", err)
		if err == auth.ErrEmailAlreadyExists {
			log.Printf("Пользователь с email %s уже существует", req.Email)
			http.Error(w, err.Error(), http.StatusConflict)
		} else {
			log.Printf("Внутренняя ошибка сервера: %v", err)
			http.Error(w, "Ошибка при регистрации: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	log.Println("Пользователь успешно зарегистрирован, генерируем токен")
	// Генерируем токен для пользователя
	token, err := h.authService.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		log.Printf("Ошибка при создании токена: %v", err)
		http.Error(w, "Ошибка при создании токена: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Println("Регистрация прошла успешно, отправляем токен")
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(TokenResponse{Token: token})
}

// Login обрабатывает запрос на вход пользователя
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Ошибка при разборе JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Проверяем, что все обязательные поля заполнены
	if req.Email == "" || req.Password == "" {
		http.Error(w, "Email и пароль обязательны", http.StatusBadRequest)
		return
	}

	log.Printf("Получен запрос на вход с email: %s, Запомнить меня: %v", req.Email, req.RememberMe)

	// Аутентифицируем пользователя с учетом опции "Запомнить меня"
	var token string
	var err error

	if req.RememberMe {
		token, err = h.authService.LoginWithRememberMe(r.Context(), req.Email, req.Password, true)
	} else {
		token, err = h.authService.Login(r.Context(), req.Email, req.Password)
	}

	if err != nil {
		if err == auth.ErrInvalidCredentials {
			http.Error(w, err.Error(), http.StatusUnauthorized)
		} else {
			http.Error(w, "Ошибка при входе: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Вход успешен для пользователя с email: %s", req.Email)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TokenResponse{Token: token})
}

// ChangePassword обрабатывает запрос на изменение пароля
func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	// Получаем ID пользователя из контекста запроса
	userID, ok := r.Context().Value("user_id").(uint)
	if !ok {
		http.Error(w, "Необходима аутентификация", http.StatusUnauthorized)
		return
	}

	var req ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Ошибка при разборе JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Проверяем, что все обязательные поля заполнены
	if req.OldPassword == "" || req.NewPassword == "" {
		http.Error(w, "Старый и новый пароль обязательны", http.StatusBadRequest)
		return
	}

	log.Printf("Получен запрос на смену пароля для пользователя с ID: %d", userID)

	// Меняем пароль
	err := h.authService.ChangePassword(r.Context(), userID, req.OldPassword, req.NewPassword)
	if err != nil {
		if err == auth.ErrInvalidCredentials {
			http.Error(w, "Неверный текущий пароль", http.StatusUnauthorized)
		} else {
			http.Error(w, "Ошибка при изменении пароля: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	log.Printf("Пароль успешно изменен для пользователя с ID: %d", userID)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Пароль успешно изменен"}`))
}
