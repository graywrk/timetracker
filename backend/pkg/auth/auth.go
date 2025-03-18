package auth

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/graywrk/timetracker/backend/internal/models"
	"github.com/graywrk/timetracker/backend/pkg/database"
	"golang.org/x/crypto/bcrypt"
)

var (
	// ErrInvalidCredentials возникает при неверных логине/пароле
	ErrInvalidCredentials = errors.New("неверные учетные данные")
	// ErrEmailAlreadyExists возникает при попытке регистрации с существующим email
	ErrEmailAlreadyExists = errors.New("пользователь с таким email уже существует")
)

// Service предоставляет методы для аутентификации и авторизации
type Service struct {
	repo               database.Repository
	jwtSecret          []byte
	jwtExpires         time.Duration
	jwtRememberExpires time.Duration
}

// NewService создает новый сервис аутентификации
func NewService(repo database.Repository, jwtSecret string, jwtExpires time.Duration, jwtRememberExpires time.Duration) *Service {
	return &Service{
		repo:               repo,
		jwtSecret:          []byte(jwtSecret),
		jwtExpires:         jwtExpires,
		jwtRememberExpires: jwtRememberExpires,
	}
}

// Claims представляет данные для JWT токена
type Claims struct {
	UserID uint `json:"user_id"`
	jwt.StandardClaims
}

// Register регистрирует нового пользователя
func (s *Service) Register(ctx context.Context, email, password string) (*models.User, error) {
	log.Printf("Начинаем регистрацию пользователя с email: %s", email)

	// Проверяем, существует ли уже пользователь с таким email
	log.Println("Проверяем существование пользователя с таким email")
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err == nil {
		log.Printf("Пользователь с email %s уже существует (ID: %d)", email, user.ID)
		return nil, ErrEmailAlreadyExists
	}
	log.Printf("Проверка существования пользователя завершена, ошибка: %v", err)

	// Хешируем пароль
	log.Println("Хешируем пароль")
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("Ошибка при хешировании пароля: %v", err)
		return nil, err
	}

	// Создаем нового пользователя
	log.Println("Создаем объект пользователя")
	user = &models.User{
		Email:    email,
		Password: string(hashedPassword),
	}

	// Сохраняем пользователя в базу
	log.Println("Сохраняем пользователя в базу данных")
	if err := s.repo.CreateUser(ctx, user); err != nil {
		log.Printf("Ошибка при сохранении пользователя в базу: %v", err)
		return nil, err
	}

	log.Printf("Пользователь успешно зарегистрирован (ID: %d)", user.ID)
	return user, nil
}

// Login аутентифицирует пользователя
func (s *Service) Login(ctx context.Context, email, password string) (string, error) {
	return s.LoginWithRememberMe(ctx, email, password, false)
}

// LoginWithRememberMe аутентифицирует пользователя с опцией "Запомнить меня"
func (s *Service) LoginWithRememberMe(ctx context.Context, email, password string, rememberMe bool) (string, error) {
	// Получаем пользователя по email
	user, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", ErrInvalidCredentials
	}

	// Проверяем пароль
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password))
	if err != nil {
		return "", ErrInvalidCredentials
	}

	// Выбираем срок действия токена в зависимости от флага "Запомнить меня"
	expirationDuration := s.jwtExpires
	if rememberMe {
		expirationDuration = s.jwtRememberExpires
	}

	// Создаем JWT токен
	expirationTime := time.Now().Add(expirationDuration)
	claims := &Claims{
		UserID: user.ID,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateToken проверяет JWT токен и возвращает ID пользователя
func (s *Service) ValidateToken(tokenString string) (uint, error) {
	claims := &Claims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil {
		return 0, err
	}

	if !token.Valid {
		return 0, errors.New("недействительный токен")
	}

	return claims.UserID, nil
}

// ChangePassword изменяет пароль пользователя
func (s *Service) ChangePassword(ctx context.Context, userID uint, oldPassword, newPassword string) error {
	// Получаем пользователя по ID
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	// Проверяем старый пароль
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword))
	if err != nil {
		return ErrInvalidCredentials
	}

	// Хешируем новый пароль
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Обновляем пароль пользователя
	user.Password = string(hashedPassword)
	return s.repo.UpdateUser(ctx, user)
}
