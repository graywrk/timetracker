package main

import (
	"context"
	"flag"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/graywrk/timetracker/backend/cmd/server/handlers"
	"github.com/graywrk/timetracker/backend/cmd/server/middleware"
	"github.com/graywrk/timetracker/backend/pkg/auth"
	"github.com/graywrk/timetracker/backend/pkg/categories"
	"github.com/graywrk/timetracker/backend/pkg/database"
	"github.com/graywrk/timetracker/backend/pkg/statistics"
	"github.com/graywrk/timetracker/backend/pkg/timetracker"
)

// Middleware для CORS
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Логируем все запросы
		log.Printf("corsMiddleware: Получен запрос %s %s", r.Method, r.URL.Path)

		// Устанавливаем заголовки CORS
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Если это предварительный запрос OPTIONS, сразу возвращаем ответ
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// Иначе продолжаем обработку
		next.ServeHTTP(w, r)
	})
}

func main() {
	// Настраиваем логирование в файл
	logFile, err := os.OpenFile("/tmp/timetracker.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		log.Printf("Ошибка открытия файла логов: %v", err)
	} else {
		log.SetOutput(io.MultiWriter(os.Stdout, logFile))
		log.Printf("Логирование настроено в файл /tmp/timetracker.log")
	}

	// Разбор аргументов командной строки
	var (
		addr               = flag.String("addr", ":8080", "HTTP server address")
		dbHost             = flag.String("db_host", "localhost", "PostgreSQL host")
		dbPort             = flag.String("db_port", "5432", "PostgreSQL port")
		dbUser             = flag.String("db_user", "postgres", "PostgreSQL user")
		dbPassword         = flag.String("db_password", "postgres", "PostgreSQL password")
		dbName             = flag.String("db_name", "timetracker", "PostgreSQL database name")
		jwtSecret          = flag.String("jwt_secret", "super_secret_key", "JWT secret key")
		jwtExpires         = flag.Duration("jwt_expires", 24*time.Hour, "JWT expiration time")
		jwtRememberExpires = flag.Duration("jwt_remember_expires", 30*24*time.Hour, "JWT expiration time for 'Remember Me'")
	)
	flag.Parse()

	// Инициализация репозитория базы данных
	repo, err := database.NewPostgresRepository(*dbHost, *dbPort, *dbUser, *dbPassword, *dbName)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer repo.Close()

	// Инициализация сервисов
	authService := auth.NewService(repo, *jwtSecret, *jwtExpires, *jwtRememberExpires)
	timeService := timetracker.NewService(repo)
	statsService := statistics.NewService(repo)
	categoryService := categories.NewService(repo)

	// Инициализация обработчиков
	authHandler := handlers.NewAuthHandler(authService)
	timeHandler := handlers.NewTimeTrackerHandler(timeService)
	statsHandler := handlers.NewStatisticsHandler(statsService)
	categoryHandler := handlers.NewCategoryHandler(categoryService)

	// Middleware для аутентификации
	authMiddleware := middleware.NewAuthMiddleware(authService)

	// Настройка маршрутов
	r := mux.NewRouter()

	// Применяем CORS middleware ко всем маршрутам
	r.Use(corsMiddleware)

	// Публичные маршруты
	r.HandleFunc("/api/auth/register", authHandler.Register).Methods("POST", "OPTIONS")
	r.HandleFunc("/api/auth/login", authHandler.Login).Methods("POST", "OPTIONS")

	// Защищенные маршруты
	api := r.PathPrefix("/api").Subrouter()
	api.Use(authMiddleware.Authenticate)

	// Маршруты для управления учетными записями
	api.HandleFunc("/auth/change-password", authHandler.ChangePassword).Methods("POST", "OPTIONS")

	// Маршруты для учета времени
	api.HandleFunc("/time/start", timeHandler.Start).Methods("POST", "OPTIONS")
	api.HandleFunc("/time/pause", timeHandler.Pause).Methods("POST", "OPTIONS")
	api.HandleFunc("/time/resume", timeHandler.Resume).Methods("POST", "OPTIONS")
	api.HandleFunc("/time/stop", timeHandler.Stop).Methods("POST", "OPTIONS")
	api.HandleFunc("/time/status", timeHandler.GetCurrentStatus).Methods("GET", "OPTIONS")
	api.HandleFunc("/time/delete", timeHandler.DeleteTimeEntry).Methods("POST", "OPTIONS")

	// Маршруты для статистики
	api.HandleFunc("/stats/week", statsHandler.GetCurrentWeekStats).Methods("GET", "OPTIONS")
	api.HandleFunc("/stats/month", statsHandler.GetCurrentMonthStats).Methods("GET", "OPTIONS")
	api.HandleFunc("/stats/custom", statsHandler.GetCustomStats).Methods("GET", "OPTIONS")

	// Маршруты для категорий
	api.HandleFunc("/categories", categoryHandler.GetCategories).Methods("GET", "OPTIONS")
	api.HandleFunc("/categories/create", categoryHandler.CreateCategory).Methods("POST", "OPTIONS")
	api.HandleFunc("/categories/update", categoryHandler.UpdateCategory).Methods("POST", "OPTIONS")
	api.HandleFunc("/categories/delete", categoryHandler.DeleteCategory).Methods("POST", "OPTIONS")

	// Добавляем эндпоинт для проверки работоспособности
	r.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET", "OPTIONS")

	// Создание сервера
	srv := &http.Server{
		Addr:         *addr,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Запуск сервера в горутине
	go func() {
		log.Printf("Server is listening on %s\n", *addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Настройка корректного завершения работы
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Контекст с таймаутом для завершения работы сервера
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}
