# TimeTracker API

REST API сервис для учета рабочего времени.

## Функциональность

- Регистрация и аутентификация пользователей
- Начало отсчета рабочего времени
- Приостановка и возобновление работы
- Завершение работы
- Получение статистики за разные периоды

## Технический стек

- Go
- PostgreSQL
- JWT для аутентификации
- RESTful API

## Запуск

### Предварительные требования

- Go 1.21 или выше
- PostgreSQL

### Настройка базы данных

1. Создайте базу данных в PostgreSQL:

```sql
CREATE DATABASE timetracker;
```

2. Примените SQL-скрипт для создания таблиц:

```bash
psql -U postgres -d timetracker -f migrations/init.sql
```

### Запуск сервера

```bash
go run cmd/server/main.go
```

Параметры запуска:

- `-addr` - адрес HTTP сервера (по умолчанию: `:8080`)
- `-db_host` - хост PostgreSQL (по умолчанию: `localhost`)
- `-db_port` - порт PostgreSQL (по умолчанию: `5432`)
- `-db_user` - пользователь PostgreSQL (по умолчанию: `postgres`)
- `-db_password` - пароль PostgreSQL (по умолчанию: `postgres`)
- `-db_name` - имя базы данных (по умолчанию: `timetracker`)
- `-jwt_secret` - секретный ключ для JWT (по умолчанию: `super_secret_key`)
- `-jwt_expires` - время жизни JWT токена (по умолчанию: `24h`)

## API Endpoints

### Аутентификация

- `POST /api/auth/register` - Регистрация нового пользователя
- `POST /api/auth/login` - Вход в систему
- `POST /api/auth/change-password` - Изменение пароля (требуется аутентификация)

### Учет времени

- `POST /api/time/start` - Начало работы
- `POST /api/time/pause` - Приостановка работы
- `POST /api/time/resume` - Возобновление работы
- `POST /api/time/stop` - Завершение работы
- `GET /api/time/status` - Получение текущего статуса

### Статистика

- `GET /api/stats/week` - Статистика за текущую неделю
- `GET /api/stats/month` - Статистика за текущий месяц
- `GET /api/stats/custom?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` - Статистика за произвольный период

## Примеры использования

### Регистрация пользователя

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Вход в систему

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Начало работы

```bash
curl -X POST http://localhost:8080/api/time/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Приостановка работы

```bash
curl -X POST http://localhost:8080/api/time/pause \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Получение статистики

```bash
curl -X GET http://localhost:8080/api/stats/week \
  -H "Authorization: Bearer YOUR_TOKEN"
``` 