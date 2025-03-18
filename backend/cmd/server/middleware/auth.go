package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/graywrk/timetracker/backend/pkg/auth"
)

// AuthMiddleware представляет middleware для аутентификации
type AuthMiddleware struct {
	authService *auth.Service
}

// NewAuthMiddleware создает новый middleware для аутентификации
func NewAuthMiddleware(authService *auth.Service) *AuthMiddleware {
	return &AuthMiddleware{
		authService: authService,
	}
}

// Authenticate проверяет JWT токен в запросе и добавляет ID пользователя в контекст
func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("AuthMiddleware: Получен запрос %s %s", r.Method, r.URL.Path)

		// Получаем заголовок Authorization
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Printf("AuthMiddleware: Заголовок Authorization отсутствует")
			http.Error(w, "Заголовок Authorization отсутствует", http.StatusUnauthorized)
			return
		}

		// Проверяем формат "Bearer token"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			log.Printf("AuthMiddleware: Неверный формат заголовка Authorization")
			http.Error(w, "Неверный формат заголовка Authorization", http.StatusUnauthorized)
			return
		}

		// Получаем токен
		tokenString := parts[1]
		log.Printf("AuthMiddleware: Получен токен: %s...", tokenString[:20])

		// Проверяем токен
		userID, err := m.authService.ValidateToken(tokenString)
		if err != nil {
			log.Printf("AuthMiddleware: Недействительный токен: %v", err)
			http.Error(w, "Недействительный токен: "+err.Error(), http.StatusUnauthorized)
			return
		}

		log.Printf("AuthMiddleware: Токен валиден, userID=%d", userID)

		// Добавляем ID пользователя в контекст запроса
		ctx := context.WithValue(r.Context(), "user_id", userID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
