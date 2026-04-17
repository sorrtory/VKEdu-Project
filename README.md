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

Из-за ограничений `livekit` развернуть локальный сервер не получится,
поэтому для разработки и тестирования нужно использовать удаленный сервер.

Имеется ввиду, что `docker` нужно использовать для развертывания.
А разработка бекенда, фронтенда и ИИ сервисов может происходить локально.

### Установка зависимостей

```bash
# Клонируем репозиторий
git clone git@github.com:sorrtory/VKEdu-Project.git

# Обновляем систему
sudo apt update -y && sudo apt upgrade -y

## Установка Node.js и modern Yarn
curl -o- https://fnm.vercel.app/install | bash
fnm install 22
corepack enable yarn

## Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh | sh

## Для запуска через docker: git-crypt для работы с зашифрованными секретами
sudo apt install git-crypt
mkdir -p ~/.local/share/git-crypt && chmod 700 ~/.local/share/git-crypt
### Скопируйте файл broadboard.key в ~/.local/share/git-crypt
### Например, с помощью scp:
scp ~/.local/share/git-crypt/broadboard.key user@host:~/.local/share/git-crypt/
chmod 600 ~/.local/share/git-crypt/broadboard.key
cd VKEdu-Project
git-crypt unlock ~/.local/share/git-crypt/broadboard.key
```

### Запуск в режиме разработки

```bash
# Подготовка окружения
cp .env.example .env

# Запуск инфраструктуры (PostgreSQL, Redis, Kafka)
docker compose --profile infra up --build -d

# Запуск в режиме разработки (без докера)
yarn install

## Бекенд
yarn workspace backend prestart:dev  # генерирует Prisma Client
yarn workspace backend seed          # заполняет базу тестовыми данными
yarn workspace backend dev           # запускает NestJS с hot reload
firefox http://localhost:3000/api    # Swagger UI

## Фронтенд
yarn workspace frontend build
yarn workspace frontend start
```

### Запуск в продакшене (через Docker)

```bash
# Запуск в докере
cp .env.example .env
# Отредактируйте .env.production указав значения для докера (есть шаблон в .env.example)
cp .env.example .env.production
# Убедитесь, что вы отредактировали .env.production и указали правильные значения для докера
yarn prod
```

## Наша команда

BroadBoard Team

| Роль  | Имя                                              |
| ----- | ------------------------------------------------ |
| Фронт | [Яковлев Сергей](https://github.com/StrayDog31)  |
| Бек ✝ | [Марышев Иван](https://github.com/ivanmaryshev)  |
| ИИ    | [Носков Алексей](https://github.com/eulerspoon)  |
| ПМ    | [Федуков Александр](https://github.com/sorrtory) |
