# Production runbook

Этот документ описывает минимальный production-запуск MVP на одном сервере через Docker Compose. Текущий published deploy читает оба файла окружения и подтягивает images из GHCR:

```bash
docker compose --env-file .env --env-file .env.production -f docker-compose.yml --profile infra --profile livekit --profile web --profile ml up -d --pull always
```

## Что должно быть на сервере

- Ubuntu/Debian сервер с публичным IP и доменом, который указывает на этот IP.
- Открытые порты: `80/tcp`, `443/tcp`, `7881/tcp`, `3478/udp`, `5349/tcp`,
  `8000-8010/udp`.
- Установлены `git`, Docker и `git-crypt`.
- Репозиторий склонирован, например в `/opt/broadboard/VKEdu-Project`.
- В корне проекта созданы `.env` и `.env.production`.
- TLS-сертификаты лежат в `infra/nginx/certs/` или смонтированы туда другим способом.
- GHCR packages с app-образами сделаны public, чтобы production-сервер мог
  выполнять pull без `docker login`.

LiveKit использует `/rtc/` для WebSocket-сигналинга через nginx, но медиа идет отдельными WebRTC-портами. Поэтому для звонков недостаточно открыть только `443`: TCP-порт `7881`, UDP-диапазон `8000-8010` и TURN-порты тоже должны быть доступны снаружи.

Для максимально простого MVP используем тот же домен для TURN/TLS:
`LIVEKIT_TURN_DOMAIN=broadboard.ru`. TURN/TLS будет работать на отдельном
порту `5349/tcp`, а `443/tcp` останется за nginx для сайта и `/rtc`.

Встроенного TURN/STUN сервера LiveKit достаточно для текущего self-hosted MVP;
отдельный coturn-сервис не нужен. Nginx проксирует только HTTP/WebSocket
сигналинг LiveKit на `/rtc`. TURN/UDP и TURN/TLS должны приходить напрямую в
контейнер `livekit` через опубликованные compose-порты `3478/udp` и `5349/tcp`.
Не добавляйте TURN в обычный `http {}` nginx-конфиг: TURN/TLS не является HTTP.

## Первый запуск

```bash
git clone https://github.com/sorrtory/VKEdu-Project.git /opt/broadboard/VKEdu-Project
cd /opt/broadboard/VKEdu-Project

cp .env.example .env
cp .env.example .env.production

# отредактировать оба файла по примерам ниже
${EDITOR:-nano} .env
${EDITOR:-nano} .env.production

docker compose --env-file .env --env-file .env.production -f docker-compose.yml --profile infra --profile livekit --profile web --profile ml up -d --pull always
```

Проверка:

```bash
docker compose --env-file .env --env-file .env.production -f docker-compose.yml --profile infra --profile livekit --profile web --profile ml ps
curl -I https://broadboard.ru
curl -I https://broadboard.ru/api/api
```

## Пример `.env`

`.env` хранит общие значения и секреты. Для прода обязательно замените пароли, JWT secret и LiveKit secret.

```dotenv
NODE_ENV=production
APP_IMAGE_PREFIX=ghcr.io/sorrtory/vkedu-project
APP_IMAGE_TAG=latest
APP_IMAGE_PULL_POLICY=always

BACKEND_DATABASE_HOST=postgres
BACKEND_KAFKA_HOST=broker
BACKEND_LIVEKIT_HOST=http://livekit:7880
BACKEND_PORT=3000
BACKEND_SUPERUSER_PASSWORD=change-me-to-a-strong-password
BACKEND_KAFKA_CLIENT_ID=backend_kafka_client
BACKEND_KAFKA_CONSUMER_GROUP_ID=backend_consumer_group
BACKEND_JWT_SECRET=change-me-to-a-long-random-secret-at-least-32-chars
BACKEND_JWT_EXPIRES_IN=15m
BACKEND_JWT_REFRESH_EXPIRES_IN=7d

POSTGRES_PORT=5432
POSTGRES_DB=BB_db
POSTGRES_USER=BB_user
POSTGRES_PASSWORD=change-me-to-a-strong-db-password
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${BACKEND_DATABASE_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}

REDIS_HOST=redis
REDIS_PORT=6379

KAFKA_PORT=9092
KAFKA_BOOTSTRAP_SERVERS=broker:9092
KAFKA_TRANSCRIPT_TOPIC=conference.transcript.voice
KAFKA_CHAT_TOPIC=conference.chat

LIVEKIT_PORT=7880
LIVEKIT_RTC_USE_EXTERNAL_IP=false
LIVEKIT_RTC_TCP_PORT=7881
LIVEKIT_RTC_UDP_PORT_START=8000
LIVEKIT_RTC_UDP_PORT_END=8010
LIVEKIT_TURN_ENABLED=false
LIVEKIT_TURN_UDP_PORT=3478
LIVEKIT_TURN_TLS_PORT=5349
LIVEKIT_TURN_DOMAIN=localhost
LIVEKIT_TURN_CERT_FILE=/etc/livekit/certs/local.crt
LIVEKIT_TURN_KEY_FILE=/etc/livekit/certs/local.key
LIVEKIT_API_KEY=prodkey
LIVEKIT_API_SECRET=change-me-to-a-long-random-livekit-secret

LIVEKIT_AGENT_LIVEKIT_URL=ws://livekit:7880
LIVEKIT_AGENT_NAME=default-agent
LIVEKIT_AGENT_LOG_LEVEL=INFO
LIVEKIT_AGENT_SILENCE_DURATION=0.5

WHISPER_MODEL_SIZE=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
WHISPER_LANGUAGE=ru

FRONTEND_PORT=3001
NEXT_PUBLIC_LIVEKIT_ROOM=my-room
NEXT_PUBLIC_LIVEKIT_AGENT_NAME=default-agent
NODE_OPTIONS=--max_old_space_size=4096

MLIN_KAFKA_GROUP_ID=mlin_group
MLIN_KAFKA_TOPICS=speechEvent,boardEvent
MLOUT_KAFKA_GROUP_ID=mlout_group
MLOUT_KAFKA_TOPICS=chatEvent,summaryEvent
LLM_API_KEY=change-me-to-your-llm-key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
```

## Пример `.env.production`

`.env.production` переопределяет значения под публичный домен и docker-сеть. `NEXT_PUBLIC_*` попадают в frontend build, поэтому после их изменения нужно заново опубликовать frontend image через `.github/workflows/build-publish-containers.yml`.

```dotenv
NODE_ENV=production

BACKEND_DATABASE_HOST=postgres
BACKEND_KAFKA_HOST=broker
BACKEND_LIVEKIT_HOST=http://livekit:7880
KAFKA_PORT=9092
KAFKA_BOOTSTRAP_SERVERS=broker:9092
REDIS_HOST=redis
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

NEXT_PUBLIC_LIVEKIT_URL=wss://broadboard.ru/rtc
NEXT_PUBLIC_BACKEND_URL=https://broadboard.ru/api
FRONTEND_INTERNAL_BACKEND_URL=http://backend:3000

LIVEKIT_RTC_USE_EXTERNAL_IP=true
LIVEKIT_TURN_ENABLED=true
LIVEKIT_TURN_DOMAIN=broadboard.ru
LIVEKIT_TURN_CERT_FILE=/etc/livekit/certs/certificate.crt
LIVEKIT_TURN_KEY_FILE=/etc/livekit/certs/certificate.key

NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
NGINX_SERVER_NAME=broadboard.ru www.broadboard.ru
NGINX_REDIRECT_TO_HTTPS=true
NGINX_FRONTEND_UPSTREAM=frontend:3001
NGINX_BACKEND_UPSTREAM=backend:3000
NGINX_LIVEKIT_UPSTREAM=livekit:7880
NGINX_SSL_CERTIFICATE=/etc/nginx/certs/certificate.crt
NGINX_SSL_CERTIFICATE_KEY=/etc/nginx/certs/certificate.key
```

Для локального docker-запуска без домена можно оставить `NGINX_REDIRECT_TO_HTTPS=false`, `NGINX_SERVER_NAME=localhost`, `NEXT_PUBLIC_LIVEKIT_URL=ws://localhost/rtc` и `NEXT_PUBLIC_BACKEND_URL=http://localhost/api`.

## TURN domain and certificate

Для простого single-domain режима TURN использует тот же host, что и сайт:
`broadboard.ru`.

- Отдельный DNS `turn.broadboard.ru` не нужен.
- `broadboard.ru/turn` не используется: TURN не является HTTP route и не имеет
  path. Клиенты подключаются к TURN как `turns:broadboard.ru:5349`.
- Сертификата на `broadboard.ru` достаточно для TURN/TLS, потому что
  `LIVEKIT_TURN_DOMAIN=broadboard.ru`.
- Практичный вариант для одного сервера: выпустить сертификат, покрывающий
  `broadboard.ru` и `www.broadboard.ru`, и положить его в
  `infra/nginx/certs/certificate.crt` /
  `infra/nginx/certs/certificate.key`.
- Этот же сертификат будет читать nginx для сайта и LiveKit для TURN/TLS,
  потому что `docker-compose.yml` монтирует `infra/nginx/certs` и в `nginx`, и
  в `livekit`.
- `NGINX_SERVER_NAME` оставьте `broadboard.ru www.broadboard.ru`; TURN-трафик
  не идет через nginx.

## GitHub Actions деплой

Основной workflow находится в `.github/workflows/deploy-published-prod.yml`. После успешного `.github/workflows/build-publish-containers.yml` на ветке `deploy` он заходит на сервер по SSH, обновляет ветку `deploy`, разблокирует `git-crypt` и запускает Docker Compose с `--pull always`, чтобы подтянуть опубликованные образы из GHCR.

Для автоматического запуска через `workflow_run` оба workflow-файла должны быть доступны в default branch репозитория. Сейчас default branch репозитория - `master`; если workflow-файлы лежат только в ветке `deploy`, GitHub не создаст run для `.github/workflows/deploy-published-prod.yml` после успешной публикации образов.

В GitHub нужно настроить environment `production` и secrets:

```text
PROD_SSH_HOST=203.0.113.10
PROD_SSH_USER=deploy
PROD_SSH_PORT=22
PROD_SSH_PRIVATE_KEY=<private key with access to the server>
PROD_PROJECT_PATH=/opt/broadboard/VKEdu-Project
```

На сервере публичный ключ из `PROD_SSH_PRIVATE_KEY` должен быть добавлен в `~deploy/.ssh/authorized_keys`, а пользователь `deploy` должен иметь доступ к Docker.

Основной deploy запускается автоматически после успешной публикации контейнеров из ветки `deploy` и вручную через `workflow_dispatch`, где можно указать branch. Production deploy намеренно отказывается деплоить ветки кроме `deploy`. Старый ручной workflow `ssh-build-prod.yml` удален, чтобы не держать второй production-путь.

## GitHub Container Registry

Workflow `.github/workflows/build-publish-containers.yml` собирает и публикует собственные контейнеры проекта в GitHub Container Registry:

- `ghcr.io/<owner>/<repo>-backend`
- `ghcr.io/<owner>/<repo>-frontend`
- `ghcr.io/<owner>/<repo>-agent`
- `ghcr.io/<owner>/<repo>-mlin`
- `ghcr.io/<owner>/<repo>-mlout`

Он запускается вручную, при push в `main` или `deploy`, и при tag вида `v*`. Для ветки `deploy` дополнительно публикуется tag `latest`; для всех запусков публикуются branch/tag refs и `sha-<commit>`.

Для публикации в GHCR отдельный personal access token не нужен, если контейнеры публикуются в registry этого же репозитория: workflow использует встроенный `${{ secrets.GITHUB_TOKEN }}` и разрешение `packages: write`.

В настройках GitHub проверьте:

- `Settings -> Actions -> General -> Workflow permissions`: workflows могут получать write permissions.
- `Settings -> Actions -> General -> Allow GitHub Actions to create and approve pull requests` не требуется для этого workflow.
- После первого publish откройте каждый package в `Packages -> Package settings -> Danger Zone -> Change visibility` и выберите `Public`. Для public container packages production-сервер сможет делать pull анонимно, без `docker login ghcr.io`.

Для frontend build workflow использует production-safe defaults. Их можно переопределить через variables в environment `production`:

```text
NEXT_PUBLIC_LIVEKIT_URL=wss://broadboard.ru/rtc
NEXT_PUBLIC_LIVEKIT_ROOM=my-room
NEXT_PUBLIC_LIVEKIT_AGENT_NAME=default-agent
NEXT_PUBLIC_BACKEND_URL=https://broadboard.ru/api
```

Это не секреты: `NEXT_PUBLIC_*` попадают в клиентский bundle. Production secrets вроде `DATABASE_URL`, JWT secret, LiveKit secret и S3 keys не нужны для сборки образов и должны оставаться только в `.env` / `.env.production` на сервере или в защищенном deployment environment.

## LiveKit checklist

- `NEXT_PUBLIC_LIVEKIT_URL` должен быть внешним адресом из браузера: `wss://<domain>/rtc` для HTTPS-прода.
- `BACKEND_LIVEKIT_HOST` и `LIVEKIT_AGENT_LIVEKIT_URL` должны быть внутренними docker-адресами: `http://livekit:7880` и `ws://livekit:7880`.
- `LIVEKIT_API_KEY` и `LIVEKIT_API_SECRET` должны совпадать для `livekit`, `backend`, `egress` и `agent`.
- На firewall/security group должны быть открыты `7881/tcp`, `3478/udp`,
  `5349/tcp` и весь `8000-8010/udp`.
- `LIVEKIT_RTC_TCP_PORT`, `LIVEKIT_RTC_UDP_PORT_START` и
  `LIVEKIT_RTC_UDP_PORT_END` управляют WebRTC media-портами в `docker-compose.yml`
  и в `LIVEKIT_CONFIG`.
- `LIVEKIT_RTC_USE_EXTERNAL_IP=true` нужен для большинства облачных VM, где
  процесс видит приватный IP, а пользователи подключаются к публичному IP.
- `LIVEKIT_TURN_ENABLED=true` включает встроенный TURN/STUN LiveKit.
- `LIVEKIT_TURN_DOMAIN` должен указывать на публичный IP сервера и совпадать с
  TLS-сертификатом в `LIVEKIT_TURN_CERT_FILE` / `LIVEKIT_TURN_KEY_FILE`.
- На одном домене TURN/TLS работает как `turns:<domain>:5349`, не как
  `<domain>/turn`. Если TURN/TLS нужен именно на `443/tcp`, используйте
  отдельный IP или L4 load balancer. На текущем одном IP `443/tcp` занят nginx.
- Если участники подключаются к комнате, но видео/аудио не проходят, проверьте
  публичный IP/NAT сервера, security group, `LIVEKIT_RTC_USE_EXTERNAL_IP` и
  DNS `LIVEKIT_TURN_DOMAIN`.

## Обновление прода вручную

```bash
cd /opt/broadboard/VKEdu-Project
git pull --ff-only origin deploy
docker compose --env-file .env --env-file .env.production -f docker-compose.yml --profile infra --profile livekit --profile web --profile ml up -d --pull always
```

Остановить прод:

```bash
docker compose --env-file .env --env-file .env.production -f docker-compose.yml --profile infra --profile livekit --profile web --profile ml down
```
