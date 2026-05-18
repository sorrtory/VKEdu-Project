# Асинхронный механизм ответов агента через Kafka

## Архитектура

```
Frontend (Chat)
    ↓ (send message with destinationIdentities=[agent])
LiveKit Data Channel
    ↓
Agent (room_agent.py)
    ├→ on_data_received: listener
    │   ↓ (publish to Kafka topic: calls.chat)
    ├→ KafkaChatResponseConsumer: listener
    │   ↓ (listen on KAFKA_CHAT_TOPIC for type=chat_response)
    │   ↓ (send_response_to_chat via publish_data)
    ↓
LiveKit Data Channel (agent-response topic)
    ↓
Frontend (Chat) - RoomEvent.DataReceived listener
    ↓
AI Chat Component (agentMessages state)
```

## Поток сообщений

### 1. Пользователь отправляет сообщение агенту
```typescript
// Frontend
await send(inputValue, { destinationIdentities: [agentIdentity] });

// Сообщение отправляется в LiveKit data channel с destinationIdentities
```

### 2. Агент получает и отправляет в Kafka
```python
# services/livekit/room_agent.py - on_data_received handler
@ctx.room.on("data_received")
def on_data_received(dp: DataPacket):
    # Parse message
    text = str(data.get("message") or "").strip()

    # Send to Kafka topic: calls.chat
    publisher.send_chat(
        text=text,
        room_id=room_id,
        room_name=room_name,
        ...
    )
```

### 3. ML модель обрабатывает и отправляет ответ
```python
# services/mlout/main.py (external ML service)
# Слушает на KAFKA_CHAT_TOPIC (calls.chat)
# Обрабатывает текст
# Отправляет ответ обратно на KAFKA_CHAT_TOPIC с type="chat_response"

message = {
    "type": "chat_response",
    "text": "Ответ модели на сообщение пользователя",
    "room_name": "conference-name",
    "timestamp": 1234567890,
    "id": "unique-response-id"
}
```

### 4. Агент получает ответ из Kafka и отправляет в чат
```python
# services/livekit/kafka_response_consumer.py
async def _consume_loop(self, send_response_callback):
    async for message in self.consumer:
        if event.get("type") != "chat_response":
            continue
        if event.get("room_name") != self.room_name:
            continue

        response_text = event.get("text", "").strip()
        await send_response_callback(response_text)
```

```python
# room_agent.py
async def send_response_to_chat(response_text: str):
    response_data = {
        "message": response_text,
        "from_agent": True,
        "timestamp": int(asyncio.get_event_loop().time() * 1000),
        "id": str(uuid.uuid4()),
    }
    payload = json.dumps(response_data).encode("utf-8")
    data_packet = DataPacket(
        topic="agent-response",
        data=payload,
    )
    await ctx.room.local_participant.publish_data(data_packet)
```

### 5. Frontend получает ответ
```typescript
// apps/frontend/src/components/ai-chat.tsx
useEffect(() => {
    const onDataReceived = (payload: Uint8Array) => {
        const data = JSON.parse(new TextDecoder().decode(payload));

        if (data.from_agent && data.message) {
            setAgentMessages(prev => [...prev, {
                text: data.message,
                timestamp: data.timestamp,
                isFromUser: false,
                id: data.id,
            }]);
        }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => room.off(RoomEvent.DataReceived, onDataReceived);
}, [room]);
```

## Разделение чатов на Frontend

### Вкладка "Общий чат"
- Все сообщения между участниками
- Исключает: сообщения с `destinationIdentities` (прямые сообщения агенту)
- Исключает: ответы агента (`from_agent=true`)

### Вкладка "AI Агент"
- Только сообщения пользователя с `destinationIdentities=[agent]`
- Только ответы агента (`from_agent=true`)
- Разделены на две стороны: отправленные пользователем (синие) и ответы (серые)

## Переменные окружения

```bash
# services/livekit/.env
KAFKA_BOOTSTRAP_SERVERS=localhost:29092  # или broker:9092 в Docker
KAFKA_CHAT_TOPIC=calls.chat             # тема для сообщений чата

# apps/frontend/.env
NEXT_PUBLIC_LIVEKIT_AGENT_NAME=default-agent  # имя агента для фильтрации
```

## Внешний ML сервис (mlout)

Должен:
1. Подписаться на `KAFKA_CHAT_TOPIC` (calls.chat)
2. Фильтровать события с `"type": "chat"` и `"room_name"` совпадением
3. Обработать текст сообщения
4. Отправить ответ обратно на ту же тему с:
   ```json
   {
     "type": "chat_response",
     "text": "ответ модели",
     "room_name": "имя комнаты из исходного сообщения",
     "timestamp": timestamp_ms,
     "id": "уникальный ID"
   }
   ```

## Тестирование

### 1. Проверить, что агент получает сообщения
```bash
# Запустить агент
cd services/livekit
docker-compose up livekit-agent

# В логах должны быть:
# CHAT MESSAGE RECEIVED: ...
```

### 2. Проверить, что агент слушает Kafka
```bash
# Посмотреть, что consumer запущен
# Должны быть логи:
# Kafka response consumer started for room ...
```

### 3. Проверить фронтенд
- Открыть конференцию
- Перейти на вкладку "AI Агент"
- Написать сообщение
- Проверить, что оно появляется в UI с меткой "Вы:"
- Когда ML модель пришлёт ответ, он должен появиться с меткой "AI Агент:"

## Возможные проблемы

### Ответы не приходят
1. Проверить, запущен ли consumer в агенте (логи: "Kafka response consumer started")
2. Проверить, что ML модель отправляет ответы с `type="chat_response"`
3. Проверить, что `room_name` в ответе совпадает с именем комнаты
4. Проверить Kafka logs: `docker-compose logs broker`

### Сообщения не разделены на вкладках
1. Проверить, что `NEXT_PUBLIC_LIVEKIT_AGENT_NAME` установлена
2. Проверить в DevTools, что `useChat()` и `RoomEvent.DataReceived` срабатывают
3. Проверить React Dev Tools, что `agentMessages` обновляется

### Неправильно разделены общий чат и чат с агентом
- Проверить, что сообщения агенту отправляются с `destinationIdentities: [agentIdentity]`
- Проверить фильтр в `generalMessages`: `msg.destinationIdentities && msg.destinationIdentities.length > 0`

## Дополнения в будущем

- [ ] Хранение истории чатов в БД
- [ ] Типизация Kafka events (JSON Schema)
- [ ] Retry logic для отправки ответов
- [ ] Timeout для ответов (если ML модель долго обрабатывает)
- [ ] Уведомление пользователю "Агент печатает..."
- [ ] Поддержка файлов и медиа в чате
