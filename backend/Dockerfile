FROM golang:1.21-alpine AS builder

WORKDIR /app

# Устанавливаем переменную среды для использования только локальных инструментов Go
ENV GOTOOLCHAIN=local

# Устанавливаем необходимые инструменты
RUN apk add --no-cache git

# Копируем файлы go.mod и go.sum
COPY go.mod go.sum ./

# Устанавливаем зависимости
RUN go mod download

# Копируем исходный код
COPY . .

# Собираем приложение с явным указанием архитектуры и платформы
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -v -o timetracker ./cmd/server

# Проверяем наличие файла
RUN ls -la

# Используем alpine для финального образа
FROM alpine:latest

WORKDIR /app

# Копируем собранное приложение из предыдущего этапа
COPY --from=builder /app/timetracker /app/
COPY --from=builder /app/migrations /app/migrations

# Устанавливаем необходимые пакеты
RUN apk --no-cache add ca-certificates tzdata wget

# Даем исполняемые права
RUN chmod +x /app/timetracker

# Проверяем наличие файла
RUN ls -la /app

# Открываем порт
EXPOSE 8000

# Запускаем приложение
# CMD ["/app/timetracker"] - переопределяется в docker-compose.yml 