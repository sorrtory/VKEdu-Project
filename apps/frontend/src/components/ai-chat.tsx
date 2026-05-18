'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IoChevronBack, IoChevronForward, IoChatbubbleEllipsesOutline } from 'react-icons/io5';
import { io, type Socket } from 'socket.io-client';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, type RemoteParticipant } from 'livekit-client';
import {
  getAgentParticipantLabel,
  isLiveKitAgentParticipant,
} from '@/src/lib/livekit-agent';

type ChatTab = 'chat' | 'summary' | 'transcript';
type SenderType = 'chat' | 'ai' | 'speaker';

interface ConferenceChatProps {
  roomName: string;
  userId: string;
  userName: string;
  isCollapsed: boolean;
  onCollapsedChange: (isCollapsed: boolean) => void;
}

interface SocketRoomEvent {
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

interface SystemItem {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
  kind: 'system';
  tone?: 'default' | 'agent';
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

function createSystemItem(event: SocketRoomEvent, action: 'joined' | 'left'): SystemItem {
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

function createAgentSystemItem({
  roomId,
  participant,
  action,
}: {
  roomId: string;
  participant: RemoteParticipant;
  action: 'joined' | 'left';
}): SystemItem {
  const createdAt = new Date().toISOString();
  const label = getAgentParticipantLabel(participant);

  return {
    id: `agent:${action}:${participant.sid || participant.identity}:${createdAt}`,
    roomId,
    text:
      action === 'joined'
        ? `${label} подключился как агент`
        : `${label} вышел из конференции`,
    createdAt,
    kind: 'system',
    tone: 'agent',
  };
}

export default function ConferenceChat({
  roomName,
  userId,
  userName,
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
  const socketRef = useRef<Socket | null>(null);
  const isCollapsedRef = useRef(isCollapsed);
  const announcedAgentIdentitiesRef = useRef<Set<string>>(new Set());
  const room = useRoomContext();

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
    if (!backendUrl) {
      return;
    }

    const socket = io(`${getSocketBaseUrl(backendUrl)}/conference`, {
      path: '/ws',
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionError(null);
      socket.emit('room:join', {
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

    socket.on('room:joined', (event: SocketRoomEvent) => {
      setChatItems((items) => [...items, createSystemItem(event, 'joined')]);
    });

    socket.on('room:left', (event: SocketRoomEvent) => {
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

    return () => {
      socket.emit('room:leave', { roomId: roomName });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomName, userId, userName]);

  useEffect(() => {
    if (!room) {
      return;
    }

    const announceAgent = (
      participant: RemoteParticipant,
      action: 'joined' | 'left',
    ) => {
      if (!isLiveKitAgentParticipant(participant)) {
        return;
      }

      const agentKey = participant.sid || participant.identity;

      if (action === 'joined') {
        if (announcedAgentIdentitiesRef.current.has(agentKey)) {
          return;
        }
        announcedAgentIdentitiesRef.current.add(agentKey);
      } else {
        announcedAgentIdentitiesRef.current.delete(agentKey);
      }

      const systemItem = createAgentSystemItem({
        roomId: roomName,
        participant,
        action,
      });
      setChatItems((items) => [...items, systemItem]);

      if (isCollapsedRef.current) {
        setUnreadCount((count) => count + 1);
      }
    };

    room.remoteParticipants.forEach((participant) => {
      announceAgent(participant, 'joined');
    });

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      announceAgent(participant, 'joined');
    };
    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      announceAgent(participant, 'left');
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    };
  }, [room, roomName]);

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

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {activeTab === 'chat' &&
          chatItems.map((item) => {
            if (isSystemItem(item)) {
              return (
                <div
                  key={item.id}
                  style={{
                    alignSelf: 'center',
                    maxWidth: '92%',
                    padding: item.tone === 'agent' ? '6px 10px' : 0,
                    border: item.tone === 'agent' ? '1px solid rgba(153, 246, 228, 0.32)' : 0,
                    borderRadius: '8px',
                    background: item.tone === 'agent' ? 'rgba(20, 184, 166, 0.12)' : 'transparent',
                    color: item.tone === 'agent' ? '#ccfbf1' : 'rgba(255,255,255,0.55)',
                    fontSize: '12px',
                    fontWeight: item.tone === 'agent' ? 700 : 400,
                    textAlign: 'center',
                  }}
                >
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
              <div>{item.text}</div>
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
