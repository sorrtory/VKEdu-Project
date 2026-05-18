# Board Snapshot Flow для ML обработки

## Обзор

Механизм автоматического отправления скриншотов доски на бэк для последующей обработки ML-моделью и синхронизации с речью спикера.

## Архитектура

```
Frontend (Excalidraw)
    ↓ (debounced screenshot capture on change)
Backend POST /conference/board/snapshot
    ↓ (processes and emits Kafka event)
Kafka topic: board.snapshot
    ↓ (consumed by ML service)
ML Service (ASR/OCR)
    ↓ (matches board state with speaker's timeline)
Synchronized context (speech + board state)
```

## Backend API

### Endpoint: `POST /conference/board/snapshot`

**Request DTO**: `SubmitBoardSnapshotDto`
```typescript
{
  conferenceId: string;        // Room/conference name identifier
  imageBase64: string;         // PNG image encoded as base64
}
```

**Response**:
```typescript
{
  success: boolean;
  capturedAt: string;          // ISO 8601 timestamp
}
```

**Kafka Event**: `board.snapshot`

Emitted event structure: `BoardSnapshotEventDto`
```typescript
{
  conferenceId: string;
  imageBase64: string;
  capturedAt: string;         // ISO timestamp of capture
  speakerId?: string;         // Optional: speaker who was talking
  revision?: string;          // Optional: board revision/version
}
```

## Frontend Implementation

### Debouncing Strategy

- **Fast updates**: Every 80ms - Excalidraw scene data sent via LiveKit data channel (for real-time sync between participants)
- **Snapshots**: Every 2 seconds after last change - Board screenshot sent to backend (for ML processing)
- **Rate limiting**: Max once per 5 seconds per screenshot to prevent flooding

### Configuration

In `apps/frontend/src/components/excalidraw.tsx`:
- `sendTimeoutRef`: Controls LiveKit data channel updates (80ms)
- `snapshotTimeoutRef`: Controls backend snapshot submission (2000ms)
- `lastSnapshotTimeRef`: Prevents sending more than once per 5 seconds

## Usage Example

```bash
# Send board snapshot
curl -X POST http://localhost:3000/conference/board/snapshot \
  -H "Content-Type: application/json" \
  -d '{
    "conferenceId": "math-class-001",
    "imageBase64": "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
  }'
```

## Integration with ML Service

ML service should:
1. Subscribe to `board.snapshot` topic in Kafka
2. Extract and process `imageBase64`
3. Run OCR/VLM to extract text/content
4. Match captured time with ASR events from the same conference
5. Create composite context: (timestamp, board_state, speech_fragment)

## Future Improvements

- Add `speakerId` from JWT token to identify who was speaking
- Store snapshots in S3/object storage instead of embedding base64 in Kafka
- Add snapshot versioning/revision tracking
- Implement incremental diffs instead of full PNG each time
- Add optional `context_documents` reference for related materials
