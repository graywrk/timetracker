-- Создание таблицы для хранения категорий
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Добавление индекса для ускорения поиска категорий пользователя
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Добавление внешнего ключа category_id в таблицу time_entries
ALTER TABLE time_entries ADD COLUMN category_id INTEGER NULL REFERENCES categories(id) ON DELETE SET NULL;

-- Индекс для поиска по категориям
CREATE INDEX idx_time_entries_category_id ON time_entries(category_id); 