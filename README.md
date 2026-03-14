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

## Архитектура - [Miro](https://miro.com/welcomeonboard/SWE1WG1pMk5uSS9vdTZIUEhqSy8rTi8vcHUzSkhMRGhLZzVZSVpNeE1jaDh4VVowRW1kdUtaU2tZM1BaUzVOVmQvSkJyZGFGQzUyNlJFVXkxbDNMV29HWkozbm42Mzhza3Mxek9VbFA5Z3Q2TU5JWmxWTXpRdjM4a3h6K3J2ZlBNakdSWkpBejJWRjJhRnhhb1UwcS9BPT0hdjE=?share_link_id=211148927232)

## Наша команда

BroadBoard Team

| Роль  | Имя                                              |
| ----- | ------------------------------------------------ |
| Фронт | [Яковлев Сергей](https://github.com/StrayDog31)  |
| Бек   | [Марышев Иван](https://github.com/ivanmaryshev)  |
| ИИ    | [Носков Алексей](https://github.com/eulerspoon)  |
| ПМ    | [Федуков Александр](https://github.com/sorrtory) |
