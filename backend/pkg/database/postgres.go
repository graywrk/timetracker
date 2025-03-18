package database

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/graywrk/timetracker/backend/internal/models"
	_ "github.com/lib/pq"
)

// PostgresRepository представляет реализацию Repository для PostgreSQL
type PostgresRepository struct {
	db *sql.DB
}

// NewPostgresRepository создает новое подключение к PostgreSQL
func NewPostgresRepository(host, port, user, password, dbname string) (*PostgresRepository, error) {
	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// Проверяем соединение
	if err := db.Ping(); err != nil {
		return nil, err
	}

	return &PostgresRepository{db: db}, nil
}

// Close закрывает соединение с базой
func (r *PostgresRepository) Close() error {
	return r.db.Close()
}

// Методы для работы с пользователями

// CreateUser создает нового пользователя
func (r *PostgresRepository) CreateUser(ctx context.Context, user *models.User) error {
	log.Printf("PostgresRepository: Создание пользователя с email: %s", user.Email)

	query := `
		INSERT INTO users (email, password, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	now := time.Now()
	user.CreatedAt = now
	user.UpdatedAt = now

	log.Printf("PostgresRepository: Выполняем запрос на вставку пользователя")
	err := r.db.QueryRowContext(ctx, query, user.Email, user.Password, user.CreatedAt, user.UpdatedAt).Scan(&user.ID)

	if err != nil {
		log.Printf("PostgresRepository: Ошибка при создании пользователя: %v", err)
		return err
	}

	log.Printf("PostgresRepository: Пользователь успешно создан с ID: %d", user.ID)
	return nil
}

// GetUserByID возвращает пользователя по ID
func (r *PostgresRepository) GetUserByID(ctx context.Context, id uint) (*models.User, error) {
	query := `SELECT id, email, password, created_at, updated_at FROM users WHERE id = $1`

	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("пользователь с ID %d не найден", id)
		}
		return nil, err
	}

	return user, nil
}

// GetUserByEmail возвращает пользователя по email
func (r *PostgresRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	log.Printf("PostgresRepository: Поиск пользователя по email: %s", email)

	query := `SELECT id, email, password, created_at, updated_at FROM users WHERE email = $1`

	user := &models.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.Password, &user.CreatedAt, &user.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			log.Printf("PostgresRepository: Пользователь с email %s не найден", email)
			return nil, fmt.Errorf("пользователь с email %s не найден", email)
		}
		log.Printf("PostgresRepository: Ошибка при поиске пользователя: %v", err)
		return nil, err
	}

	log.Printf("PostgresRepository: Пользователь найден, ID: %d", user.ID)
	return user, nil
}

// UpdateUser обновляет данные пользователя
func (r *PostgresRepository) UpdateUser(ctx context.Context, user *models.User) error {
	query := `
		UPDATE users
		SET email = $1, password = $2, updated_at = $3
		WHERE id = $4
	`

	user.UpdatedAt = time.Now()

	_, err := r.db.ExecContext(ctx, query, user.Email, user.Password, user.UpdatedAt, user.ID)
	return err
}

// DeleteUser удаляет пользователя
func (r *PostgresRepository) DeleteUser(ctx context.Context, id uint) error {
	query := `DELETE FROM users WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// Методы для работы с записями о времени

// CreateTimeEntry создает новую запись о времени
func (r *PostgresRepository) CreateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	// Проверяем, есть ли уже активная запись для пользователя
	activeEntry, err := r.GetActiveTimeEntryForUser(ctx, entry.UserID)
	if err != nil {
		return fmt.Errorf("ошибка при проверке активных записей: %w", err)
	}

	if activeEntry != nil {
		return fmt.Errorf("у пользователя уже есть активная запись времени")
	}

	// Устанавливаем время создания и обновления
	now := time.Now()
	entry.CreatedAt = now
	entry.UpdatedAt = now

	// Устанавливаем начальные значения
	entry.StartTime = now
	entry.Status = models.StatusActive
	entry.TotalPaused = 0

	// SQL запрос для создания записи
	query := `
		INSERT INTO time_entries (
			user_id, start_time, end_time, paused_at, resumed_at,
			total_paused, status, category_id, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`

	// Обрабатываем NULL значения для времени
	var endTime, pausedAt, resumedAt sql.NullTime

	// Обрабатываем NULL значение для category_id
	var categoryID sql.NullInt64
	if entry.CategoryID != nil {
		categoryID.Int64 = int64(*entry.CategoryID)
		categoryID.Valid = true
	}

	// Выполняем запрос
	err = r.db.QueryRowContext(
		ctx,
		query,
		entry.UserID,
		entry.StartTime,
		endTime,
		pausedAt,
		resumedAt,
		entry.TotalPaused,
		entry.Status,
		categoryID,
		entry.CreatedAt,
		entry.UpdatedAt,
	).Scan(&entry.ID)

	if err != nil {
		return fmt.Errorf("ошибка при создании записи времени: %w", err)
	}

	return nil
}

// GetTimeEntryByID получает запись времени по ID
func (r *PostgresRepository) GetTimeEntryByID(ctx context.Context, id uint) (*models.TimeEntry, error) {
	query := `
		SELECT 
			id, user_id, start_time, end_time, 
			paused_at, resumed_at, total_paused, status, 
			category_id, created_at, updated_at
		FROM time_entries
		WHERE id = $1
	`

	entry := &models.TimeEntry{}
	var categoryID sql.NullInt64
	var endTime, pausedAt, resumedAt sql.NullTime
	var status string

	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.StartTime,
		&endTime,
		&pausedAt,
		&resumedAt,
		&entry.TotalPaused,
		&status,
		&categoryID,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("запись времени с id=%d не найдена", id)
		}
		return nil, fmt.Errorf("ошибка при получении записи времени: %w", err)
	}

	// Устанавливаем значения времени
	if endTime.Valid {
		entry.EndTime = endTime.Time
	}
	if pausedAt.Valid {
		entry.PausedAt = pausedAt.Time
	}
	if resumedAt.Valid {
		entry.ResumedAt = resumedAt.Time
	}

	// Устанавливаем статус
	entry.Status = models.Status(status)

	// Устанавливаем category_id и загружаем категорию, если она есть
	if categoryID.Valid {
		categoryIDUint := uint(categoryID.Int64)
		entry.CategoryID = &categoryIDUint

		// Если есть category_id, загружаем категорию отдельным запросом
		category, err := r.GetCategoryByID(ctx, categoryIDUint)
		if err == nil {
			entry.Category = category
		}
	}

	return entry, nil
}

// GetTimeEntriesByUserID возвращает все записи о времени для пользователя
func (r *PostgresRepository) GetTimeEntriesByUserID(ctx context.Context, userID uint) ([]*models.TimeEntry, error) {
	query := `
		SELECT 
			te.id, te.user_id, te.start_time, te.end_time, 
			te.paused_at, te.resumed_at, te.total_paused, te.status, 
			te.category_id, te.created_at, te.updated_at,
			COALESCE(c.id, 0), COALESCE(c.user_id, 0), c.name, c.color, c.created_at, c.updated_at
		FROM time_entries te
		LEFT JOIN categories c ON te.category_id = c.id
		WHERE te.user_id = $1
		ORDER BY te.start_time DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	entries := []*models.TimeEntry{}
	for rows.Next() {
		entry := &models.TimeEntry{}
		var categoryID sql.NullInt64
		var categoryFields struct {
			ID        uint
			UserID    uint
			Name      sql.NullString
			Color     sql.NullString
			CreatedAt sql.NullTime
			UpdatedAt sql.NullTime
		}

		var endTime, pausedAt, resumedAt sql.NullTime
		var status string

		err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&entry.StartTime,
			&endTime,
			&pausedAt,
			&resumedAt,
			&entry.TotalPaused,
			&status,
			&categoryID,
			&entry.CreatedAt,
			&entry.UpdatedAt,
			&categoryFields.ID,
			&categoryFields.UserID,
			&categoryFields.Name,
			&categoryFields.Color,
			&categoryFields.CreatedAt,
			&categoryFields.UpdatedAt,
		)

		if err != nil {
			return nil, err
		}

		// Устанавливаем значения времени
		if endTime.Valid {
			entry.EndTime = endTime.Time
		}
		if pausedAt.Valid {
			entry.PausedAt = pausedAt.Time
		}
		if resumedAt.Valid {
			entry.ResumedAt = resumedAt.Time
		}

		// Устанавливаем статус
		entry.Status = models.Status(status)

		// Устанавливаем категорию, если она есть
		if categoryID.Valid {
			categoryIDUint := uint(categoryID.Int64)
			entry.CategoryID = &categoryIDUint

			// Создаем объект категории только если все необходимые поля присутствуют
			if categoryFields.ID > 0 && categoryFields.UserID > 0 {
				category := &models.Category{
					ID:     categoryFields.ID,
					UserID: categoryFields.UserID,
				}

				if categoryFields.Name.Valid {
					category.Name = categoryFields.Name.String
				}
				if categoryFields.Color.Valid {
					category.Color = categoryFields.Color.String
				}
				if categoryFields.CreatedAt.Valid {
					category.CreatedAt = categoryFields.CreatedAt.Time
				}
				if categoryFields.UpdatedAt.Valid {
					category.UpdatedAt = categoryFields.UpdatedAt.Time
				}

				entry.Category = category
			}
		}

		entries = append(entries, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return entries, nil
}

// GetActiveTimeEntryForUser получает активную запись времени для пользователя
func (r *PostgresRepository) GetActiveTimeEntryForUser(ctx context.Context, userID uint) (*models.TimeEntry, error) {
	// Сначала получаем только запись времени без JOIN с категориями
	query := `
		SELECT 
			id, user_id, start_time, end_time, 
			paused_at, resumed_at, total_paused, status, 
			category_id, created_at, updated_at
		FROM time_entries 
		WHERE user_id = $1 AND status != 'completed'
		ORDER BY created_at DESC
		LIMIT 1
	`

	entry := &models.TimeEntry{}
	var categoryID sql.NullInt64
	var endTime, pausedAt, resumedAt sql.NullTime
	var status string

	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&entry.ID,
		&entry.UserID,
		&entry.StartTime,
		&endTime,
		&pausedAt,
		&resumedAt,
		&entry.TotalPaused,
		&status,
		&categoryID,
		&entry.CreatedAt,
		&entry.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("ошибка при получении активной записи: %w", err)
	}

	// Устанавливаем значения времени
	if endTime.Valid {
		entry.EndTime = endTime.Time
	}
	if pausedAt.Valid {
		entry.PausedAt = pausedAt.Time
	}
	if resumedAt.Valid {
		entry.ResumedAt = resumedAt.Time
	}

	// Устанавливаем статус
	entry.Status = models.Status(status)

	// Устанавливаем category_id только если оно не NULL
	if categoryID.Valid {
		categoryIDUint := uint(categoryID.Int64)
		entry.CategoryID = &categoryIDUint

		// Если есть category_id, загружаем категорию отдельным запросом
		category, err := r.GetCategoryByID(ctx, categoryIDUint)
		if err == nil {
			entry.Category = category
		}
	} else {
		// Если categoryID = NULL, явно устанавливаем CategoryID как nil
		entry.CategoryID = nil
	}

	return entry, nil
}

// UpdateTimeEntry обновляет запись о времени
func (r *PostgresRepository) UpdateTimeEntry(ctx context.Context, entry *models.TimeEntry) error {
	query := `
		UPDATE time_entries
		SET end_time = $1, paused_at = $2, resumed_at = $3,
		    total_paused = $4, status = $5, updated_at = $6
		WHERE id = $7
	`

	entry.UpdatedAt = time.Now()

	// Обрабатываем NULL значения для времени
	var endTime, pausedAt, resumedAt sql.NullTime

	if !entry.EndTime.IsZero() {
		endTime.Time = entry.EndTime
		endTime.Valid = true
	}

	if !entry.PausedAt.IsZero() {
		pausedAt.Time = entry.PausedAt
		pausedAt.Valid = true
	}

	if !entry.ResumedAt.IsZero() {
		resumedAt.Time = entry.ResumedAt
		resumedAt.Valid = true
	}

	_, err := r.db.ExecContext(
		ctx, query,
		endTime, pausedAt, resumedAt,
		entry.TotalPaused, entry.Status, entry.UpdatedAt, entry.ID,
	)

	return err
}

// DeleteTimeEntry удаляет запись о времени
func (r *PostgresRepository) DeleteTimeEntry(ctx context.Context, id uint) error {
	query := `DELETE FROM time_entries WHERE id = $1`

	_, err := r.db.ExecContext(ctx, query, id)
	return err
}

// GetUserStatsByPeriod возвращает статистику за период
func (r *PostgresRepository) GetUserStatsByPeriod(ctx context.Context, userID uint, startDate, endDate string) ([]*models.TimeEntry, error) {
	log.Printf("GetUserStatsByPeriod: НАЧАЛО ВЫПОЛНЕНИЯ МЕТОДА с параметрами userID=%d, startDate=%s, endDate=%s", userID, startDate, endDate)

	// Формируем SQL запрос с использованием DATE() для корректного сравнения дат
	query := `
		SELECT id, user_id, start_time, end_time, status, total_paused
		FROM time_entries
		WHERE user_id = $1 
		AND DATE(start_time) >= DATE($2)
		AND DATE(start_time) <= DATE($3)
		AND status = 'completed'
		ORDER BY start_time DESC
	`

	log.Printf("GetUserStatsByPeriod: Выполняем SQL запрос: %s с параметрами: %d, %s, %s",
		query, userID, startDate, endDate)

	rows, err := r.db.QueryContext(ctx, query, userID, startDate, endDate)
	if err != nil {
		log.Printf("GetUserStatsByPeriod: Ошибка при выполнении запроса: %v", err)
		return nil, fmt.Errorf("ошибка при получении записей: %w", err)
	}
	defer rows.Close()

	var entries []*models.TimeEntry

	for rows.Next() {
		entry := &models.TimeEntry{}
		var status string

		err := rows.Scan(
			&entry.ID,
			&entry.UserID,
			&entry.StartTime,
			&entry.EndTime,
			&status,
			&entry.TotalPaused,
		)

		if err != nil {
			log.Printf("GetUserStatsByPeriod: Ошибка при сканировании строки: %v", err)
			return nil, fmt.Errorf("ошибка при сканировании записи: %w", err)
		}

		entry.Status = models.Status(status)
		entries = append(entries, entry)
	}

	if err = rows.Err(); err != nil {
		log.Printf("GetUserStatsByPeriod: Ошибка при обработке результатов: %v", err)
		return nil, fmt.Errorf("ошибка при обработке результатов: %w", err)
	}

	log.Printf("GetUserStatsByPeriod: Найдено %d записей", len(entries))

	// Если записей нет, выводим дополнительную информацию для отладки
	if len(entries) == 0 {
		var count int
		err := r.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM time_entries WHERE user_id = $1", userID).Scan(&count)
		if err != nil {
			log.Printf("GetUserStatsByPeriod: Ошибка при проверке количества записей: %v", err)
		} else {
			log.Printf("GetUserStatsByPeriod: В базе данных найдено всего %d записей для пользователя %d", count, userID)

			// Проверяем записи без фильтрации по дате
			checkRows, err := r.db.QueryContext(ctx,
				"SELECT id, DATE(start_time) FROM time_entries WHERE user_id = $1", userID)
			if err != nil {
				log.Printf("GetUserStatsByPeriod: Ошибка при проверке записей: %v", err)
			} else {
				defer checkRows.Close()
				log.Printf("GetUserStatsByPeriod: Доступные записи для пользователя %d:", userID)
				for checkRows.Next() {
					var id int
					var date string
					if err := checkRows.Scan(&id, &date); err == nil {
						log.Printf("ID: %d, Дата: %s", id, date)
					}
				}
			}
		}
	}

	return entries, nil
}

// CreateCategory создает новую категорию в базе данных
func (r *PostgresRepository) CreateCategory(ctx context.Context, category *models.Category) error {
	now := time.Now()
	category.CreatedAt = now
	category.UpdatedAt = now

	query := `
		INSERT INTO categories (user_id, name, color, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	err := r.db.QueryRowContext(
		ctx,
		query,
		category.UserID,
		category.Name,
		category.Color,
		category.CreatedAt,
		category.UpdatedAt,
	).Scan(&category.ID)

	if err != nil {
		return fmt.Errorf("ошибка при создании категории: %w", err)
	}

	return nil
}

// GetCategoryByID получает категорию по ID
func (r *PostgresRepository) GetCategoryByID(ctx context.Context, id uint) (*models.Category, error) {
	query := `
		SELECT id, user_id, name, color, created_at, updated_at
		FROM categories
		WHERE id = $1
	`

	category := &models.Category{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&category.ID,
		&category.UserID,
		&category.Name,
		&category.Color,
		&category.CreatedAt,
		&category.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("категория с id=%d не найдена", id)
		}
		return nil, fmt.Errorf("ошибка при получении категории: %w", err)
	}

	return category, nil
}

// GetCategoriesByUserID получает все категории пользователя
func (r *PostgresRepository) GetCategoriesByUserID(ctx context.Context, userID uint) ([]*models.Category, error) {
	query := `
		SELECT id, user_id, name, color, created_at, updated_at
		FROM categories
		WHERE user_id = $1
		ORDER BY name ASC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка при получении категорий пользователя: %w", err)
	}
	defer rows.Close()

	var categories []*models.Category

	for rows.Next() {
		category := &models.Category{}
		err := rows.Scan(
			&category.ID,
			&category.UserID,
			&category.Name,
			&category.Color,
			&category.CreatedAt,
			&category.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("ошибка при сканировании категории: %w", err)
		}

		categories = append(categories, category)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("ошибка при обработке результатов: %w", err)
	}

	return categories, nil
}

// UpdateCategory обновляет существующую категорию
func (r *PostgresRepository) UpdateCategory(ctx context.Context, category *models.Category) error {
	now := time.Now()
	category.UpdatedAt = now

	query := `
		UPDATE categories
		SET name = $1, color = $2, updated_at = $3
		WHERE id = $4 AND user_id = $5
	`

	result, err := r.db.ExecContext(
		ctx,
		query,
		category.Name,
		category.Color,
		category.UpdatedAt,
		category.ID,
		category.UserID,
	)

	if err != nil {
		return fmt.Errorf("ошибка при обновлении категории: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("ошибка при получении количества измененных строк: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("категория с id=%d не найдена или не принадлежит пользователю", category.ID)
	}

	return nil
}

// DeleteCategory удаляет категорию
func (r *PostgresRepository) DeleteCategory(ctx context.Context, id uint) error {
	query := `
		DELETE FROM categories
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("ошибка при удалении категории: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("ошибка при получении количества удаленных строк: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("категория с id=%d не найдена", id)
	}

	return nil
}
