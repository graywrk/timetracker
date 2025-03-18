# TimeTracker

Приложение для отслеживания рабочего времени с возможностью просмотра статистики.

## Структура проекта

Проект состоит из двух частей:
- `frontend` - клиентская часть на React с TypeScript
- `backend` - серверная часть на Go

## Функциональность

- Регистрация и авторизация пользователей
- Отслеживание рабочего времени (старт, пауза, остановка)
- Просмотр статистики по отработанному времени
- Адаптивный дизайн для мобильных устройств

## Установка и запуск

### С использованием Docker (рекомендуется)

Проект настроен для запуска с использованием Docker и Docker Compose:

```bash
# Запуск всего приложения
docker-compose up

# Сборка и запуск с обновлением образов
docker-compose up --build

# Запуск в фоновом режиме
docker-compose up -d

# Остановка контейнеров
docker-compose down

# Остановка контейнеров и удаление томов (удалит данные базы)
docker-compose down -v
```

Приложение будет доступно по адресам:
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000](http://localhost:8000)

### Без использования Docker

#### Требования

- Node.js (версия 14 или выше)
- npm или yarn
- Go (версия 1.20 или выше)
- PostgreSQL

#### Установка зависимостей

```bash
# Установка зависимостей для frontend
cd frontend
npm install

# Установка зависимостей для backend
cd backend
go mod download
```

#### Запуск приложения в режиме разработки

```bash
# Запуск frontend
cd frontend
npm start

# Запуск backend
cd backend
go run cmd/timetracker/main.go
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

## Тестирование

### Frontend тесты

Проект содержит обширную тестовую инфраструктуру для frontend части:

```bash
# Запуск всех тестов
cd frontend
npm test

# Запуск конкретного теста
npm test -- --testPathPattern=/__tests__/Login.test.tsx

# Запуск тестов с генерацией отчета о покрытии
npm test -- --coverage
```

#### Структура тестов

- `frontend/src/__tests__/` - основная директория с тестами
  - `components/` - тесты для компонентов
  - `api/` - тесты для API модулей
  - `testUtils.ts` - общие утилиты для тестирования

#### Руководство по тестированию

Подробное руководство по тестированию доступно в файле [frontend/docs/testing-guide.md](frontend/docs/testing-guide.md).
Руководство содержит информацию о лучших практиках, примерах и утилитах для тестирования.

### Backend тесты

Для запуска тестов backend части:

```bash
# Запуск всех тестов
cd backend
go test ./...

# Запуск тестов с выводом подробной информации
go test ./... -v

# Запуск конкретного пакета тестов
go test ./internal/api/...
```

## Технологии

### Frontend
- React
- TypeScript
- React Router
- CSS
- Jest и React Testing Library для тестирования

### Backend
- Go
- PostgreSQL
- JWT для аутентификации
- Стандартный пакет testing для тестирования

## Структура frontend

```
frontend/
  ├── public/
  ├── src/
  │   ├── api/            # API для взаимодействия с сервером
  │   ├── components/     # React компоненты
  │   │   ├── Auth/       # Компоненты авторизации
  │   │   ├── Categories/ # Компоненты управления категориями
  │   │   ├── Charts/     # Компоненты графиков для статистики
  │   │   ├── Header/     # Компонент заголовка
  │   │   ├── NotFound/   # Компонент 404 страницы
  │   │   ├── Statistics/ # Компонент статистики
  │   │   └── TimeTracker/ # Компонент трекера времени
  │   ├── __tests__/      # Тесты
  │   │   ├── components/ # Тесты компонентов
  │   │   ├── api/        # Тесты API
  │   │   └── testUtils.ts # Утилиты для тестирования
  │   ├── utils/          # Вспомогательные функции
  │   ├── App.css         # Основные стили
  │   ├── App.tsx         # Основной компонент приложения
  │   └── index.tsx       # Входная точка приложения
  ├── docs/
  │   └── testing-guide.md # Руководство по тестированию
  ├── package.json
  └── tsconfig.json
```

## Расширенная функциональность

### Категории задач

Приложение поддерживает создание и использование категорий для классификации задач:

- Создание, редактирование и удаление категорий с возможностью выбора цвета
- Отслеживание времени с привязкой к выбранной категории
- Просмотр статистики времени, распределенной по категориям
- Фильтрация по категориям для более точного анализа

Доступ к управлению категориями: [http://localhost:3000/categories](http://localhost:3000/categories)

### Статистика и визуализация данных

Приложение предоставляет расширенные возможности для визуализации данных:

- Интерактивные графики, показывающие распределение времени:
  - Гистограмма ежедневного рабочего времени
  - Круговая диаграмма распределения времени по категориям
  - Линейный график для анализа тенденций по дням недели
- Экспорт и печать отчетов
- Настраиваемые временные периоды для анализа

### Использование API

Для интеграции с другими приложениями, TimeTracker предоставляет RESTful API:

```bash
# Получение статуса активной задачи
GET /api/time/status

# Начало отслеживания времени
POST /api/time/start
Body: { "category_id": 1 }  # Опционально

# Получение статистики за период
GET /api/stats/custom?start_date=2025-01-01&end_date=2025-12-31

# Управление категориями
GET /api/categories         # Получение списка категорий
POST /api/categories/create # Создание категории
```

## Развертывание в production

Для развертывания приложения в production среде рекомендуется:

1. Использовать HTTPS для защиты передаваемых данных
2. Настроить правильное управление секретами (JWT ключи, пароли БД)
3. Использовать реверс-прокси (например, Nginx) перед backend API
4. Настроить механизм резервного копирования базы данных

### Пример настройки Nginx для production:

```nginx
server {
    listen 80;
    server_name timetracker.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name timetracker.example.com;

    ssl_certificate /etc/letsencrypt/live/timetracker.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/timetracker.example.com/privkey.pem;

    # Frontend статические файлы
    location / {
        root /var/www/timetracker/frontend;
        try_files $uri /index.html;
    }

    # Backend API проксирование
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Планы развития

- Добавление уведомлений и напоминаний
- Интеграция с календарем
- Экспорт данных в различные форматы (CSV, PDF)
- Мобильное приложение для Android и iOS
- Интеграция с популярными инструментами для управления проектами

## Лицензия

MIT 