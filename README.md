# BroadBoard

Проект представляет собой платформу для проведения видеоконференций. В платформу интегрирован ИИ для автоматического создания конспектов речи и заметок с онлайн-доски.

## Основные функции MVP

- Видеоконференции
- Онлайн-доска
- Рилтайм саммари и субтитры
- Общение в чате (голосом?) с ИИ в контексте саммари и доски

## Технологический стек

- API - Node.js + NestJS
- Фронтенд - React + Next, Tailwind
- WebRTC - LiveKit
- Онлайн-доска - Excalidraw
- Инфраструктура - Docker, Nginx, Coturn, SocketIO, Redis, Postgres, Minio, RabbitMQ
- AI - Fafka Event Handlers, VAD, ASR (FastAPI), VLM (FastAPI), LLM (vLLM).

## Архитектура

- [Miro](https://miro.com/welcomeonboard/SWE1WG1pMk5uSS9vdTZIUEhqSy8rTi8vcHUzSkhMRGhLZzVZSVpNeE1jaDh4VVowRW1kdUtaU2tZM1BaUzVOVmQvSkJyZGFGQzUyNlJFVXkxbDNMV29HWkozbm42Mzhza3Mxek9VbFA5Z3Q2TU5JWmxWTXpRdjM4a3h6K3J2ZlBNakdSWkpBejJWRjJhRnhhb1UwcS9BPT0hdjE=?share_link_id=211148927232)
- [Figma](https://www.figma.com/design/RiuDMv1oV24M95TdV43Yjf/BroadBoard?node-id=0-1&p=f&t=GjVTFzmFC96vlobo-0)

## Быстрый старт

```bash
# Подготовка окружения
cp .env.example .env
cp .env.example .env.production
# Отредактируйте .env.production указав значения для докера

# Запуск инфраструктуры (PostgreSQL, Redis, Kafka)
docker compose --profile infra up --build -d

# Запуск в режиме разработки (без докера)
yarn install
yarn workspace backend prestart:dev  # генерирует Prisma Client
yarn workspace backend seed          # заполняет базу тестовыми данными
yarn workspace backend dev           # запускает NestJS с hot reload

firefox http://localhost:3000/api # Swagger UI

#############
# Запуск в докере
# Убедитесь, что вы отредактировали .env.production и указали правильные значения для докера
docker compose -f docker-compose.yml --profile infra --profile web up --build -d
docker compose --env-file .env --env-file .env.production -f docker-compose.yml --profile infra --profile web up --build -d
```

## Наша команда

BroadBoard Team

| Роль  | Имя                                              |
| ----- | ------------------------------------------------ |
| Фронт | [Яковлев Сергей](https://github.com/StrayDog31)  |
| Бек   | [Марышев Иван](https://github.com/ivanmaryshev)  |
| ИИ    | [Носков Алексей](https://github.com/eulerspoon)  |
| ПМ    | [Федуков Александр](https://github.com/sorrtory) |
