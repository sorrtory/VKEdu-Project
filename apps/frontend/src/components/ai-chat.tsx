'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IoChevronBack,
  IoChevronForward,
  IoChatbubbleEllipsesOutline,
  IoPlayOutline,
  IoRefreshOutline,
  IoStopOutline,
} from 'react-icons/io5';
import { io, type Socket } from 'socket.io-client';

type ChatTab = 'chat' | 'summary' | 'transcript';
type SenderType = 'chat' | 'ai' | 'speaker';

interface ConferenceChatProps {
  roomName: string;
  userId: string;
  userName: string;
  creatorId: string;
  isCollapsed: boolean;
  onCollapsedChange: (isCollapsed: boolean) => void;
}

interface RoomEvent {
  roomId: string;
  participantId: string;
  participantName: string;
  socketId: string;
  createdAt: string;
}

interface MessageEvent {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: SenderType;
  text: string;
  createdAt: string;
}

interface StreamEvent {
  id?: string;
  roomId: string;
  text?: string;
  content?: string;
  createdAt?: string;
}

interface StreamItem {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
}

interface HistoryResponse<T> {
  success: boolean;
  items: T[];
}

interface SummaryTickerResponse {
  success: boolean;
  active?: boolean;
  intervalSeconds?: number | null;
  lastRequestedAt?: string | null;
  firstRequest?: {
    requested?: boolean;
    reason?: string;
  };
  requested?: boolean;
  reason?: string;
  error?: string;
}

interface SystemItem {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
  kind: 'system';
}

type ChatItem = MessageEvent | SystemItem;

const tabLabels: Record<ChatTab, string> = {
  chat: 'Чат',
  summary: 'Саммари',
  transcript: 'Расшифровка',
};

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

function getSocketBaseUrl(url: string): string {
  return url.replace(/\/+$/, '').replace(/\/api$/, '');
}

function getBackendHttpUrl(path: string): string {
  return `/api/${path.replace(/^\/+/, '')}`;
}

function getStreamText(event: StreamEvent): string {
  return event.text ?? event.content ?? '';
}

function createStreamItem(event: StreamEvent): StreamItem {
  return {
    id: event.id ?? crypto.randomUUID(),
    roomId: event.roomId,
    text: getStreamText(event),
    createdAt: event.createdAt ?? new Date().toISOString(),
  };
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSystemItem(item: ChatItem): item is SystemItem {
  return 'kind' in item;
}

function createSystemItem(event: RoomEvent, action: 'joined' | 'left'): SystemItem {
  return {
    id: `${action}:${event.socketId}:${event.createdAt}`,
    roomId: event.roomId,
    text:
      action === 'joined'
        ? `${event.participantName} вошел в чат`
        : `${event.participantName} вышел из чата`,
    createdAt: event.createdAt,
    kind: 'system',
  };
}

export default function ConferenceChat({
  roomName,
  userId,
  userName,
  creatorId,
  isCollapsed,
  onCollapsedChange,
}: ConferenceChatProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>('chat');
  const [inputValue, setInputValue] = useState('');
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [summaryItems, setSummaryItems] = useState<StreamItem[]>([]);
  const [transcriptItems, setTranscriptItems] = useState<StreamItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(
    backendUrl ? null : 'NEXT_PUBLIC_BACKEND_URL не настроен',
  );
  const [summaryControlError, setSummaryControlError] = useState<string | null>(null);
  const [isSummaryControlPending, setIsSummaryControlPending] = useState(false);
  const [isSummaryTickerActive, setIsSummaryTickerActive] = useState(false);
  const [summaryTickerIntervalSeconds, setSummaryTickerIntervalSeconds] = useState(60);
  const socketRef = useRef<Socket | null>(null);
  const isCollapsedRef = useRef(isCollapsed);

  const canControlSummary = userId === creatorId;
  const canSend = activeTab === 'chat' && inputValue.trim().length > 0;

  const currentStreamItems = useMemo(() => {
    if (activeTab === 'summary') return summaryItems;
    if (activeTab === 'transcript') return transcriptItems;
    return [];
  }, [activeTab, summaryItems, transcriptItems]);

  useEffect(() => {
    isCollapsedRef.current = isCollapsed;
  }, [isCollapsed]);

  useEffect(() => {
    if (!canControlSummary || activeTab !== 'summary') {
      return;
    }

    let isActive = true;
    void fetch(getBackendHttpUrl(`conference/${encodeURIComponent(roomName)}/ticker`))
      .then((response) => response.json() as Promise<SummaryTickerResponse>)
      .then((payload) => {
        if (!isActive || !payload.success) return;
        setIsSummaryTickerActive(Boolean(payload.active));
        if (payload.intervalSeconds) {
          setSummaryTickerIntervalSeconds(payload.intervalSeconds);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [activeTab, canControlSummary, roomName]);

  useEffect(() => {
    if (!backendUrl) {
      return;
    }

    let isActive = true;
    let socket: Socket | null = null;

    const loadHistory = async () => {
      const [chatResponse, summaryResponse, transcriptResponse] = await Promise.all([
        fetch(getBackendHttpUrl(`conference/${encodeURIComponent(roomName)}/chat`)),
        fetch(getBackendHttpUrl(`conference/${encodeURIComponent(roomName)}/summary`)),
        fetch(getBackendHttpUrl(`conference/${encodeURIComponent(roomName)}/transcript`)),
      ]);

      const [chat, summary, transcript] = await Promise.all([
        chatResponse.json() as Promise<HistoryResponse<ChatItem>>,
        summaryResponse.json() as Promise<HistoryResponse<StreamItem>>,
        transcriptResponse.json() as Promise<HistoryResponse<StreamItem>>,
      ]);

      if (!isActive) {
        return;
      }

      setChatItems(chat.items ?? []);
      setSummaryItems(summary.items ?? []);
      setTranscriptItems(transcript.items ?? []);
    };

    const connectSocket = () => {
      socket = io(`${getSocketBaseUrl(backendUrl)}/conference`, {
        path: '/ws',
        transports: ['websocket'],
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnectionError(null);
        socket?.emit('room:join', {
          roomId: roomName,
          participantId: userId,
          participantName: userName,
        });
      });

      socket.on('connect_error', (error) => {
        setConnectionError(error.message);
      });

      socket.on('exception', (error: { message?: string }) => {
        setConnectionError(error.message ?? 'Ошибка websocket');
      });

      socket.on('room:joined', (event: RoomEvent) => {
        setChatItems((items) => [...items, createSystemItem(event, 'joined')]);
      });

      socket.on('room:left', (event: RoomEvent) => {
        setChatItems((items) => [...items, createSystemItem(event, 'left')]);
      });

      socket.on('message:new', (event: MessageEvent) => {
        setChatItems((items) => [...items, event]);
        if (isCollapsedRef.current && event.senderId !== userId) {
          setUnreadCount((count) => count + 1);
        }
      });

      socket.on('summary:new', (event: StreamEvent) => {
        const item = createStreamItem(event);
        if (!item.text.trim()) return;
        setSummaryItems((items) => [...items, item]);
      });

      socket.on('transcript:new', (event: StreamEvent) => {
        const item = createStreamItem(event);
        if (!item.text.trim()) return;
        setTranscriptItems((items) => [...items, item]);
      });
    };

    void loadHistory()
      .catch((error: Error) => {
        if (isActive) {
          setConnectionError(error.message);
        }
      })
      .finally(() => {
        if (isActive) {
          connectSocket();
        }
      });

    return () => {
      isActive = false;
      socket?.emit('room:leave', { roomId: roomName });
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [roomName, userId, userName]);

  const handleSendMessage = () => {
    const text = inputValue.trim();
    if (!text || activeTab !== 'chat') return;

    socketRef.current?.emit('message:send', {
      roomId: roomName,
      senderId: userId,
      senderName: userName,
      text,
    });
    setInputValue('');
  };

  const runSummaryAction = async (action: () => Promise<SummaryTickerResponse>) => {
    setIsSummaryControlPending(true);
    setSummaryControlError(null);
    try {
      const payload = await action();
      if (!payload.success) {
        throw new Error(payload.error ?? 'Не удалось выполнить действие');
      }

      if ('active' in payload) {
        setIsSummaryTickerActive(Boolean(payload.active));
        if (payload.intervalSeconds) {
          setSummaryTickerIntervalSeconds(payload.intervalSeconds);
        }
      }

      const skippedEmptyRoom =
        payload.reason === 'empty-room' || payload.firstRequest?.reason === 'empty-room';
      if (skippedEmptyRoom) {
        setSummaryControlError('В комнате нет участников, запрос саммари пропущен');
      }
    } catch (error) {
      setSummaryControlError(error instanceof Error ? error.message : 'Ошибка управления саммари');
    } finally {
      setIsSummaryControlPending(false);
    }
  };

  const requestSummaryNow = () => {
    void runSummaryAction(async () => {
      const response = await fetch(
        getBackendHttpUrl(`conference/${encodeURIComponent(roomName)}/summary/request`),
        { method: 'POST' },
      );
      return response.json() as Promise<SummaryTickerResponse>;
    });
  };

  const updateSummaryTicker = (action: 'start' | 'stop') => {
    void runSummaryAction(async () => {
      const response = await fetch(getBackendHttpUrl(`conference/${encodeURIComponent(roomName)}/ticker`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          intervalSeconds: summaryTickerIntervalSeconds,
        }),
      });
      return response.json() as Promise<SummaryTickerResponse>;
    });
  };

  const hasUnreadMessages = unreadCount > 0;
  const toggleButtonColor = hasUnreadMessages ? '#38bdf8' : '#64748b';
  const handleCollapsedChange = (nextIsCollapsed: boolean) => {
    isCollapsedRef.current = nextIsCollapsed;
    if (!nextIsCollapsed) {
      setUnreadCount(0);
    }
    onCollapsedChange(nextIsCollapsed);
  };

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: hasUnreadMessages && isCollapsed ? '#0c2538' : '#0b1220',
        transition: 'background 220ms ease, box-shadow 220ms ease',
        boxShadow: hasUnreadMessages && isCollapsed ? 'inset 3px 0 0 #38bdf8' : 'inset 1px 0 0 rgba(255,255,255,0.08)',
      }}
    >
      <button
        type="button"
        onClick={() => handleCollapsedChange(!isCollapsed)}
        aria-label={isCollapsed ? 'Открыть чат' : 'Свернуть чат'}
        title={isCollapsed ? 'Открыть чат' : 'Свернуть чат'}
        style={{
          position: 'absolute',
          top: '10px',
          right: isCollapsed ? '50%' : '10px',
          zIndex: 2,
          width: '30px',
          height: '30px',
          transform: isCollapsed ? 'translateX(50%)' : 'none',
          display: 'grid',
          placeItems: 'center',
          borderRadius: '999px',
          border: `1px solid ${hasUnreadMessages ? 'rgba(56,189,248,0.65)' : 'rgba(255,255,255,0.14)'}`,
          background: hasUnreadMessages ? '#0ea5e9' : '#111827',
          color: 'white',
          cursor: 'pointer',
          boxShadow: hasUnreadMessages
            ? '0 8px 22px rgba(14,165,233,0.35)'
            : '0 8px 18px rgba(0,0,0,0.28)',
          transition: 'right 260ms ease, transform 260ms ease, background 180ms ease, border-color 180ms ease',
        }}
      >
        {isCollapsed ? <IoChevronBack size={16} /> : <IoChevronForward size={16} />}
      </button>

      {isCollapsed && (
        <button
          type="button"
          onClick={() => handleCollapsedChange(false)}
          aria-label="Открыть чат"
          title="Открыть чат"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            flexDirection: 'column',
            border: 'none',
            background: 'transparent',
            color: toggleButtonColor,
            cursor: 'pointer',
            padding: '54px 0 18px',
            transition: 'color 180ms ease',
          }}
        >
          <span
            style={{
              position: 'relative',
              width: '34px',
              height: '34px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '999px',
              background: hasUnreadMessages ? 'rgba(56,189,248,0.16)' : 'rgba(148,163,184,0.1)',
              border: `1px solid ${hasUnreadMessages ? 'rgba(56,189,248,0.55)' : 'rgba(148,163,184,0.24)'}`,
            }}
          >
            <IoChatbubbleEllipsesOutline size={19} />
            {hasUnreadMessages && (
              <span
                style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 5px',
                  borderRadius: '999px',
                  display: 'grid',
                  placeItems: 'center',
                  background: '#38bdf8',
                  color: '#082f49',
                  fontSize: '10px',
                  fontWeight: 800,
                  lineHeight: 1,
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            Чат
          </span>
        </button>
      )}

      <div
        aria-hidden={isCollapsed}
        style={{
          minWidth: 0,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          opacity: isCollapsed ? 0 : 1,
          transform: isCollapsed ? 'translateX(12px)' : 'translateX(0)',
          pointerEvents: isCollapsed ? 'none' : 'auto',
          transition: 'opacity 180ms ease, transform 240ms ease',
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        {(Object.keys(tabLabels) as ChatTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '12px 8px',
              background: activeTab === tab ? '#1e293b' : 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              fontSize: '13px',
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
        </div>

        {connectionError && (
          <div style={{ padding: '8px 12px', background: '#7f1d1d', color: 'white', fontSize: '12px' }}>
            {connectionError}
          </div>
        )}

        {activeTab === 'summary' && canControlSummary && (
          <div
            style={{
              display: 'grid',
              gap: '8px',
              padding: '10px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              background: '#0f172a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={requestSummaryNow}
                disabled={isSummaryControlPending}
                title="Запросить саммари сейчас"
                aria-label="Запросить саммари сейчас"
                style={{
                  width: '34px',
                  height: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '8px',
                  border: '1px solid rgba(59,130,246,0.45)',
                  background: '#1d4ed8',
                  color: 'white',
                  cursor: isSummaryControlPending ? 'default' : 'pointer',
                }}
              >
                <IoRefreshOutline size={16} />
              </button>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: 0,
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '12px',
                }}
              >
                <span>Интервал</span>
                <input
                  type="number"
                  min={15}
                  max={3600}
                  value={summaryTickerIntervalSeconds}
                  onChange={(event) => setSummaryTickerIntervalSeconds(Number(event.target.value))}
                  style={{
                    width: '70px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: '#111827',
                    color: 'white',
                  }}
                />
                <span>сек</span>
              </label>
              <button
                type="button"
                onClick={() => updateSummaryTicker(isSummaryTickerActive ? 'stop' : 'start')}
                disabled={isSummaryControlPending}
                title={isSummaryTickerActive ? 'Остановить авто-саммари' : 'Запустить авто-саммари'}
                aria-label={isSummaryTickerActive ? 'Остановить авто-саммари' : 'Запустить авто-саммари'}
                style={{
                  marginLeft: 'auto',
                  width: '34px',
                  height: '32px',
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '8px',
                  border: `1px solid ${isSummaryTickerActive ? 'rgba(248,113,113,0.5)' : 'rgba(34,197,94,0.5)'}`,
                  background: isSummaryTickerActive ? '#991b1b' : '#166534',
                  color: 'white',
                  cursor: isSummaryControlPending ? 'default' : 'pointer',
                }}
              >
                {isSummaryTickerActive ? <IoStopOutline size={16} /> : <IoPlayOutline size={16} />}
              </button>
            </div>
            {summaryControlError && (
              <div style={{ color: '#fbbf24', fontSize: '12px', lineHeight: 1.35 }}>
                {summaryControlError}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeTab === 'chat' &&
          chatItems.map((item) => {
            if (isSystemItem(item)) {
              return (
                <div key={item.id} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '12px' }}>
                  {item.text}
                </div>
              );
            }

            const isOwnMessage = item.senderId === userId;
            const isAiMessage = item.senderType === 'ai';

            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isAiMessage ? '#334155' : isOwnMessage ? '#2563eb' : '#1e293b',
                    color: 'white',
                    wordBreak: 'break-word',
                  }}
                >
                  <div style={{ fontSize: '12px', opacity: 0.78, marginBottom: '4px' }}>
                    {isOwnMessage ? 'Вы' : item.senderName}
                  </div>
                  <div>{item.text}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '4px' }}>
                    {formatTime(item.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}

        {activeTab !== 'chat' &&
          currentStreamItems.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#111827',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.08)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <div style={{ lineHeight: 1.5 }}>{item.text}</div>
              <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '6px' }}>
                {formatTime(item.createdAt)}
              </div>
            </div>
          ))}

        {activeTab === 'chat' && chatItems.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px', fontSize: '14px' }}>
            Нет сообщений
          </div>
        )}

        {activeTab !== 'chat' && currentStreamItems.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px', fontSize: '14px' }}>
            Пока нет данных
          </div>
        )}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
            <input
              type="text"
              value={inputValue}
              disabled={activeTab !== 'chat'}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSendMessage();
              }}
              placeholder={activeTab === 'chat' ? 'Сообщение всем или @ai...' : 'Этот поток только для чтения'}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: activeTab === 'chat' ? '#1e293b' : '#111827',
                color: 'white',
                outline: 'none',
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!canSend}
              style={{
                flexShrink: 0,
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                background: canSend ? '#2563eb' : '#334155',
                color: 'white',
                cursor: canSend ? 'pointer' : 'default',
              }}
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
