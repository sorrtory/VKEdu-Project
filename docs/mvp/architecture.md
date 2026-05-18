# BroadBoard MVP Architecture

1. Можем ли мы реализовать общий чат на socket io? Агент тогда нужен только на время конфы для звука. Выхода нет, придется!
2. за счет чего мы добиваемся синхронизации доски? Backend + redis. А сейчас оно как на локалхосте работает?
3. Будет ли MLout класть в контекст редиски ответ от LLM? Нет, это делает ML IN
4. Будет ли использоваться Livekit Agent для вызова LLM? Нет!

TODO: надо решить как синхранизировать доску.
Practical handshake pattern (recommended, minimal changes to your current code in excalidraw.tsx):
On join, non-creator clients publish a small {"type":"request-scene"} data message addressed to the creator identity.
The creator listens for request-scene and replies with {"type":"full-scene","elements":[...]} where elements = excalidrawAPI.getSceneElements().
New clients, on receiving full-scene, call excalidrawAPI.updateScene({ elements }).
Keep your existing edit sends as incremental/full-scene but debounce (you already use 80ms — good).

```
Backend: слушает HTTP API /api
- GET /conference/{id}/summary?type=json/pdf    : получение истории саммари       -> преобразованная postgres data в ответ
- GET /conference/{id}/transcript?type=json/pdf : получение истории расшифровки   -> преобразованная postgres data в ответ
- GET /conference/{id}/chat    				    : получение истории чата  		  -> преобразованная postgres data в ответ
- GET /conference/{id}/files                    : получение списка файлов конфы   -> postgres metadata для карточек файлов
- POST /conference/{id}/upload                  : загрузка файла в контекст конфы -> conferences/{id}/... в s3-compatible хранилище и conference.chat.file в кафке
- GET /conference/{id}/download?file=objectKey  : скачивание файла     			  -> presigned ссылка на s3-compatible хранилище
- POST /conference/{id}/boardcrop				: отправка blob снепшота доски    -> emit в кафка conference.boardcrop
<!-- 
В MVP по дефолту хотим включить тикер. Управление тикером через HTTP API пока не делаем, но в будущем может быть так:
- POST /conference/{id}/ticker body: cmd=start/stop target=summary. interval=N : включить тикер на беке  -> conference.summary.request каждые N секунд. 
-->

Backend: слушает Websocket /ws
- socketio namespace: /conference
-- room:join   : смотрим на room_id, проверяем права -> сажаем клиента в группу room:<room_id>
-- room:joined : подтверждаем вход нового участника -> все видят нового участника в чате
-- room:leave  : отключаем клиента из группы -> все видят что участник вышел
-- Группа room:<room_id>
--- message:send : слушаем новое сообщение от клиента ->
---- на фронте можно проверять на @ai. Публикуем как чат или ai запрос message:send { scope: "chat" | "ai" }
---- публикуем в комнату как message:new c sender_type = me/ai/speaker/chat
---- на conference.chat.ai.request
---- иначе
---- на conference.chat
--- message:new    : отсылаем общее сообщение всем клиентам
--- error          : сюда пятисотим по ws ошибкам
--- summary:new    : отдельный чат-лог, куда клиенту нельзя писать -> клиент получает текстовое саммари от ллм
--- transcript:new : отдельный чат-лог, куда клиенту нельзя писать -> клиент получает расшифровку от ллм (картинки как ссылки на s3)

Backend: тикер
(пока включен всегда, но в будущем может управляться спикером через кнопку на фронте)
- каждые 10 секунд запрашивает саммари 	-> на conference.summary.request

Backend: слушает кафку
- conference.chat.ai.response : получает ответ ии, сохраняет в базу и публикует его в websocket  -> room:<room_id> на message:new
- conference.summary.response : получает чанк саммари, сохраняет в базу и публикует его в ws     -> room:<room_id> на summary:new
- conference.transcript       : получает чанк расшифровки, сохраняет в базу и публикует его в ws -> room:<room_id> на transcript:new

Agent: подключается к конфе
- Слушает голос в конфе : преобразует его в текст через виспер, кладет в кафку расшифровки голоса -> на conference.transcript.voice


ML in: слушает кафку
- conference.chat             : загрузка сообщения чата в контекст
- conference.chat.ai.request  : загрузка промптов в контекст
- conference.chat.ai.response : загрузка ответов в контекст
- conference.chat.file        : загрузка s3 ссылки в редис (LLM будет сама читать файлы? или также VLM?)
- conference.boardcrop        : преобразует картинку от смарт кропа в текст через VLM
- conference.transcript.voice : преобразует текст от голоса в контекст
-> Создает расшифровку и пишет ее в кафку на conference.transcript
-> Переписывает обновленный контекс в редис. То есть оформляем context как огромный json. Тут нужна структура чтобы LLM не упала
: conference:<id> = {context:<json>, attachments:<s3 links>, transcript:<text>, ai_req:<prompts>, ai_resp:<text>}

ML out: слушает кафку
- conference.chat.ai.request : спрашивает LLM, используя контекст из редиса 				-> conference.chat.ai.response
- conference.summary.request : создает чанк расшифровки (голос и чат) конференции по ролям 	-> conference.summary.response

Пример расшифровки:
Участник 1 (голос) : Привет
Доска (участник 1) : <3
Участник 2 (чат)   : Здравствуйте!
**Спикер** (голос) : Всем добрый день

Пример самари:
# Лекция 1
Участники поздоровались.
Участник 1 нарисовал сердечко и выразил свою любовь ко встречам.
```

Postgres для MVP:
- `conferenceName` из API/LiveKit/socket считаем стабильным `roomName` конференции.
- На одну конференцию создается один `ConferenceChat`.
- Сообщения пользователей, `@ai` запросы, ответы AI и карточки файлов хранятся в `ChatMessage`.
- Загруженные файлы хранятся в S3-compatible storage, а в Postgres лежат метаданные `ConferenceAttachment`; карточка файла в чате ссылается на attachment.
- Расшифровка и саммари хранятся чанками в `TranscriptEntry` и `SummaryEntry`, чтобы архив можно было отдавать как JSON и позже преобразовывать в markdown/pdf.
