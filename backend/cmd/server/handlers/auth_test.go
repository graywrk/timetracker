package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/auth"
)

// MockAuthService представляет мок сервиса аутентификации
type MockAuthService struct {
	registerFunc            func(ctx context.Context, email, password string) (*models.User, error)
	loginFunc               func(ctx context.Context, email, password string) (string, error)
	changePasswordFunc      func(ctx context.Context, userID uint, oldPassword, newPassword string) error
	loginWithRememberMeFunc func(ctx context.Context, email, password string, rememberMe bool) (string, error)
}

// Register мок метода
func (m *MockAuthService) Register(ctx context.Context, email, password string) (*models.User, error) {
	if m.registerFunc != nil {
		return m.registerFunc(ctx, email, password)
	}
	return nil, errors.New("не реализовано")
}

// Login мок метода
func (m *MockAuthService) Login(ctx context.Context, email, password string) (string, error) {
	if m.loginFunc != nil {
		return m.loginFunc(ctx, email, password)
	}
	return "", errors.New("не реализовано")
}

// ValidateToken мок метода
func (m *MockAuthService) ValidateToken(tokenString string) (uint, error) {
	return 1, nil // Всегда возвращаем успех с ID=1
}

// ChangePassword мок метода
func (m *MockAuthService) ChangePassword(ctx context.Context, userID uint, oldPassword, newPassword string) error {
	if m.changePasswordFunc != nil {
		return m.changePasswordFunc(ctx, userID, oldPassword, newPassword)
	}
	return errors.New("не реализовано")
}

// LoginWithRememberMe мок метода
func (m *MockAuthService) LoginWithRememberMe(ctx context.Context, email, password string, rememberMe bool) (string, error) {
	if m.loginWithRememberMeFunc != nil {
		return m.loginWithRememberMeFunc(ctx, email, password, rememberMe)
	}
	return "", errors.New("не реализовано")
}

// TestRegister тестирует обработчик Register
func TestRegister(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    RegisterRequest
		mockRegister   func(ctx context.Context, email, password string) (*models.User, error)
		mockLogin      func(ctx context.Context, email, password string) (string, error)
		expectedStatus int
		expectedToken  bool // true если ожидаем токен в ответе
	}{
		{
			name: "Успешная регистрация",
			requestBody: RegisterRequest{
				Email:    "test@example.com",
				Password: "password123",
			},
			mockRegister: func(ctx context.Context, email, password string) (*models.User, error) {
				return &models.User{
					ID:    1,
					Email: email,
				}, nil
			},
			mockLogin: func(ctx context.Context, email, password string) (string, error) {
				return "test-token", nil
			},
			expectedStatus: http.StatusCreated,
			expectedToken:  true,
		},
		{
			name: "Email уже существует",
			requestBody: RegisterRequest{
				Email:    "existing@example.com",
				Password: "password123",
			},
			mockRegister: func(ctx context.Context, email, password string) (*models.User, error) {
				return nil, auth.ErrEmailAlreadyExists
			},
			mockLogin:      nil,
			expectedStatus: http.StatusConflict,
			expectedToken:  false,
		},
		{
			name: "Внутренняя ошибка сервера",
			requestBody: RegisterRequest{
				Email:    "test@example.com",
				Password: "password123",
			},
			mockRegister: func(ctx context.Context, email, password string) (*models.User, error) {
				return nil, errors.New("ошибка базы данных")
			},
			mockLogin:      nil,
			expectedStatus: http.StatusInternalServerError,
			expectedToken:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Создаем мок сервиса
			mockService := &MockAuthService{
				registerFunc: tt.mockRegister,
				loginFunc:    tt.mockLogin,
			}

			// Создаем обработчик
			handler := NewAuthHandler(mockService)

			// Создаем запрос
			reqBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			// Создаем ResponseRecorder для записи ответа
			rr := httptest.NewRecorder()

			// Вызываем обработчик
			handler.Register(rr, req)

			// Проверяем статус ответа
			if status := rr.Code; status != tt.expectedStatus {
				t.Errorf("handler вернул неверный статус: получили %v, хотели %v",
					status, tt.expectedStatus)
			}

			// Проверяем тело ответа, если ожидаем токен
			if tt.expectedToken {
				var response TokenResponse
				err := json.Unmarshal(rr.Body.Bytes(), &response)
				if err != nil {
					t.Errorf("Не удалось разобрать JSON ответа: %v", err)
				}
				if response.Token != "test-token" {
					t.Errorf("Ответ содержит неверный токен: получили %v, хотели %v",
						response.Token, "test-token")
				}
			}
		})
	}
}

// TestLogin тестирует обработчик Login
func TestLogin(t *testing.T) {
	tests := []struct {
		name           string
		requestBody    LoginRequest
		mockLogin      func(ctx context.Context, email, password string) (string, error)
		expectedStatus int
		expectedToken  bool // true если ожидаем токен в ответе
	}{
		{
			name: "Успешный вход",
			requestBody: LoginRequest{
				Email:    "test@example.com",
				Password: "password123",
			},
			mockLogin: func(ctx context.Context, email, password string) (string, error) {
				return "test-token", nil
			},
			expectedStatus: http.StatusOK,
			expectedToken:  true,
		},
		{
			name: "Неверные учетные данные",
			requestBody: LoginRequest{
				Email:    "test@example.com",
				Password: "wrongpassword",
			},
			mockLogin: func(ctx context.Context, email, password string) (string, error) {
				return "", auth.ErrInvalidCredentials
			},
			expectedStatus: http.StatusUnauthorized,
			expectedToken:  false,
		},
		{
			name: "Внутренняя ошибка сервера",
			requestBody: LoginRequest{
				Email:    "test@example.com",
				Password: "password123",
			},
			mockLogin: func(ctx context.Context, email, password string) (string, error) {
				return "", errors.New("ошибка базы данных")
			},
			expectedStatus: http.StatusInternalServerError,
			expectedToken:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Создаем мок сервиса
			mockService := &MockAuthService{
				loginFunc: tt.mockLogin,
			}

			// Создаем обработчик
			handler := NewAuthHandler(mockService)

			// Создаем запрос
			reqBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			// Создаем ResponseRecorder для записи ответа
			rr := httptest.NewRecorder()

			// Вызываем обработчик
			handler.Login(rr, req)

			// Проверяем статус ответа
			if status := rr.Code; status != tt.expectedStatus {
				t.Errorf("handler вернул неверный статус: получили %v, хотели %v",
					status, tt.expectedStatus)
			}

			// Проверяем тело ответа, если ожидаем токен
			if tt.expectedToken {
				var response TokenResponse
				err := json.Unmarshal(rr.Body.Bytes(), &response)
				if err != nil {
					t.Errorf("Не удалось разобрать JSON ответа: %v", err)
				}
				if response.Token != "test-token" {
					t.Errorf("Ответ содержит неверный токен: получили %v, хотели %v",
						response.Token, "test-token")
				}
			}
		})
	}
}

// TestChangePassword тестирует обработчик ChangePassword
func TestChangePassword(t *testing.T) {
	tests := []struct {
		name               string
		requestBody        interface{} // Меняем тип на interface{} для поддержки невалидных запросов
		mockChangePassword func(ctx context.Context, userID uint, oldPassword, newPassword string) error
		expectedStatus     int
	}{
		{
			name: "Успешная смена пароля",
			requestBody: ChangePasswordRequest{
				OldPassword: "password123",
				NewPassword: "newpassword123",
			},
			mockChangePassword: func(ctx context.Context, userID uint, oldPassword, newPassword string) error {
				return nil
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Неверный старый пароль",
			requestBody: ChangePasswordRequest{
				OldPassword: "wrongpassword",
				NewPassword: "newpassword123",
			},
			mockChangePassword: func(ctx context.Context, userID uint, oldPassword, newPassword string) error {
				return auth.ErrInvalidCredentials
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "Внутренняя ошибка сервера",
			requestBody: ChangePasswordRequest{
				OldPassword: "password123",
				NewPassword: "newpassword123",
			},
			mockChangePassword: func(ctx context.Context, userID uint, oldPassword, newPassword string) error {
				return errors.New("ошибка базы данных")
			},
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name: "Неверный формат запроса",
			requestBody: struct {
				WrongField string `json:"wrong_field"`
			}{
				WrongField: "некорректные данные",
			},
			mockChangePassword: nil, // Мок не должен вызываться
			expectedStatus:     http.StatusBadRequest,
		},
		{
			name:               "Пустой запрос",
			requestBody:        map[string]string{},
			mockChangePassword: nil, // Мок не должен вызываться
			expectedStatus:     http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Создаем мок сервиса
			mockService := &MockAuthService{
				changePasswordFunc: tt.mockChangePassword,
			}

			// Создаем обработчик
			handler := NewAuthHandler(mockService)

			// Создаем запрос
			reqBody, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest("POST", "/change-password", bytes.NewBuffer(reqBody))
			req.Header.Set("Content-Type", "application/json")

			// Добавляем пользователя в контекст (обычно это делает middleware)
			ctx := context.WithValue(req.Context(), "user_id", uint(1))
			req = req.WithContext(ctx)

			// Создаем ResponseRecorder для записи ответа
			rr := httptest.NewRecorder()

			// Вызываем обработчик
			handler.ChangePassword(rr, req)

			// Проверяем статус ответа
			if status := rr.Code; status != tt.expectedStatus {
				t.Errorf("Обработчик вернул неверный статус: получили %v, хотели %v",
					status, tt.expectedStatus)
			}
		})
	}
}

func TestChangePasswordNoUserID(t *testing.T) {
	// Создаем мок сервиса
	mockService := &MockAuthService{}

	// Создаем обработчик
	handler := NewAuthHandler(mockService)

	// Создаем запрос с валидными данными
	reqBody, _ := json.Marshal(ChangePasswordRequest{
		OldPassword: "password123",
		NewPassword: "newpassword123",
	})
	req, _ := http.NewRequest("POST", "/change-password", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	// НЕ добавляем пользователя в контекст

	// Создаем ResponseRecorder для записи ответа
	rr := httptest.NewRecorder()

	// Вызываем обработчик
	handler.ChangePassword(rr, req)

	// Проверяем статус ответа - должен быть Unauthorized (401),
	// так как пользователь не аутентифицирован
	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("Обработчик вернул неверный статус при отсутствии user_id: получили %v, хотели %v",
			status, http.StatusUnauthorized)
	}
}
