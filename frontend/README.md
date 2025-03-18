# TimeTracker Frontend

Клиентская часть приложения TimeTracker, написанная на React с TypeScript.

## Установка и запуск

### Требования

- Node.js (версия 14 или выше)
- npm или yarn

### Установка зависимостей

```bash
npm install
```

### Запуск в режиме разработки

```bash
npm start
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

### Сборка для production

```bash
npm run build
```

Готовые файлы будут находиться в папке `build`.

## Тестирование

Проект использует Jest и React Testing Library для тестирования.

### Запуск тестов

```bash
# Запуск всех тестов
npm test

# Запуск конкретного теста
npm test -- --testPathPattern=/__tests__/Login.test.tsx

# Запуск тестов с генерацией отчета о покрытии
npm test -- --coverage
```

### Структура тестов

- `src/__tests__/` - основная директория с тестами
  - `components/` - тесты для компонентов
  - `api/` - тесты для API модулей
  - `testUtils.ts` - общие утилиты для тестирования

### Утилиты для тестирования

Мы создали набор утилит для упрощения написания тестов:

```typescript
// Рендеринг компонента со всеми необходимыми провайдерами
import { renderWithProviders } from './__tests__/testUtils';

// Мокирование localStorage
import { setupLocalStorageMock } from './__tests__/testUtils';
const localStorageMock = setupLocalStorageMock();

// Мокирование API
import { setupFetchMock, setupFetchErrorMock } from './__tests__/testUtils';
const cleanupFetch = setupFetchMock({ data: 'example' });
```

Полное описание утилит для тестирования и рекомендации можно найти в [docs/testing-guide.md](docs/testing-guide.md).

## Структура проекта

```
frontend/
  ├── public/            # Статические файлы
  ├── src/               # Исходный код
  │   ├── api/           # API для взаимодействия с сервером
  │   ├── components/    # React компоненты
  │   │   ├── Auth/      # Компоненты авторизации
  │   │   ├── Header/    # Компонент заголовка
  │   │   ├── NotFound/  # Компонент 404 страницы
  │   │   ├── Statistics/ # Компонент статистики
  │   │   └── TimeTracker/ # Компонент трекера времени
  │   ├── context/       # React контексты
  │   ├── utils/         # Вспомогательные функции
  │   ├── __tests__/     # Тесты
  │   │   ├── components/ # Тесты компонентов
  │   │   ├── api/        # Тесты API
  │   │   └── testUtils.ts # Утилиты для тестирования
  │   ├── App.css        # Основные стили
  │   ├── App.tsx        # Основной компонент приложения
  │   └── index.tsx      # Входная точка приложения
  ├── docs/              # Документация
  │   └── testing-guide.md # Руководство по тестированию
  ├── package.json       # Зависимости и скрипты
  └── tsconfig.json      # Конфигурация TypeScript
``` 