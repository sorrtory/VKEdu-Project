'use client';

import {
  Chat,
  ControlBar,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useCreateLayoutContext,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import ExcalidrawBoard from '@/src/components/excalidraw';
import { useRouter } from 'next/navigation';
import { Track } from 'livekit-client';
import { CustomChat } from './ai-chat';
import { useState } from 'react';

interface ConferenceRoomProps {
  roomName: string;
  userName: string;
  userId: string;
  serverUrl: string;
  token: string;
  creatorId: string;
}

// 👇 Внутренний компонент — здесь безопасно использовать useTracks
function RoomContent({ creatorId }: { creatorId: string }) {
  const layoutContext = useCreateLayoutContext();
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  
  // Состояние для переключения режима чата
  const [chatMode, setChatMode] = useState<'general' | 'ai'>('general');

  // ID агента - замените на реальный identity вашего ML агента
  const AGENT_IDENTITY = 'ml-agent'; // или получите из контекста/пропсов

  return (
    <LayoutContextProvider value={layoutContext}>
      <div
        style={{
          display: 'grid',
          gridTemplateRows: '120px minmax(0, 1fr) auto',
          gap: '10px',
          height: '100%',
          width: '100%',
          padding: '10px',
          boxSizing: 'border-box',
        }}
      >
        {/* Thumbnails */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '4px',
          }}
        >
          {cameraTracks.map((trackRef, index) => {
            if (!trackRef) return null;
            return (
              <div
                key={`${trackRef.participant.identity}-${trackRef.publication?.trackSid ?? trackRef.source ?? index}`}
                style={{
                  flex: '0 0 180px',
                  height: '110px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: '#111827',
                }}
              >
                <ParticipantTile trackRef={trackRef} />
              </div>
            );
          })}
        </div>

        <div
          style={{
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: '10px',
          }}
        >
          <div style={{ minHeight: 0, borderRadius: '10px', overflow: 'hidden' }}>
            <ExcalidrawBoard creatorIdentity={creatorId} />
          </div>

          <div
            style={{
              minHeight: 0,
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#0b1220',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Заголовок чата с кнопками переключения */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                padding: '8px',
                gap: '8px',
                backgroundColor: '#0f172a',
              }}
            >
              <button
                onClick={() => setChatMode('general')}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: chatMode === 'general' ? '#3b82f6' : '#1e293b',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: chatMode === 'general' ? 'bold' : 'normal',
                }}
              >
                💬 Общий чат
              </button>
              <button
                onClick={() => setChatMode('ai')}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: chatMode === 'ai' ? '#3b82f6' : '#1e293b',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontWeight: chatMode === 'ai' ? 'bold' : 'normal',
                }}
              >
                🤖 AI Агент
              </button>
            </div>

            {/* Область чата */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {chatMode === 'general' ? (
                <Chat />
              ) : (
                <CustomChat agentIdentity={AGENT_IDENTITY} />
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
          <ControlBar
            controls={{
              chat: true,
              screenShare: true,
              leave: true,
            }}
          />
        </div>
      </div>
    </LayoutContextProvider>
  );
}

// 👆 Конец внутреннего компонента

export default function ConferenceRoom({
  roomName,
  userName,
  userId,
  serverUrl,
  token,
  creatorId,
}: ConferenceRoomProps) {
  const router = useRouter();

  const handleDisconnect = () => {
    router.push('/');
  };

  return (
    <div
      className="conference-wrapper"
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#0f172a',
      }}
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={true}
        video={true}
        data-lk-theme="default"
        onDisconnected={handleDisconnect}
      >
        <RoomContent creatorId={creatorId} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}