'use client';

import {
  ControlBar,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  type TrackReferenceOrPlaceholder,
  useCreateLayoutContext,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import ExcalidrawBoard from '@/src/components/excalidraw';
import { useRouter } from 'next/navigation';
import { Track } from 'livekit-client';
import CustomChat from './ai-chat';
import { useState } from 'react';
import { FaChalkboard, FaColumns, FaDesktop } from 'react-icons/fa';
import { isLiveKitAgentParticipant } from '@/src/lib/livekit-agent';

interface ConferenceRoomProps {
  roomName: string;
  userId: string;
  userName: string;
  serverUrl: string;
  token: string;
  creatorId: string;
}

interface RoomContentProps {
  creatorId: string;
  roomName: string;
  userId: string;
  userName: string;
}

type StageMode = 'board' | 'screen' | 'split';

const stageModes: Array<{
  mode: StageMode;
  label: string;
  icon: typeof FaChalkboard;
}> = [
  { mode: 'board', label: 'Только доска', icon: FaChalkboard },
  { mode: 'screen', label: 'Только скринкаст', icon: FaDesktop },
  { mode: 'split', label: 'Доска и скринкаст', icon: FaColumns },
];

function ConferenceParticipantTile({
  trackRef,
}: {
  trackRef: TrackReferenceOrPlaceholder;
}) {
  const isAgent = isLiveKitAgentParticipant(trackRef.participant);

  return (
    <div
      className={`conference-participant-tile${isAgent ? ' conference-participant-tile--agent' : ''}`}
      aria-label={isAgent ? 'Участник конференции: агент' : undefined}
    >
      <ParticipantTile trackRef={trackRef} />
      {isAgent && (
        <div className="conference-agent-badge">
          <span className="conference-agent-badge__indicator" aria-hidden="true" />
          Агент
        </div>
      )}
    </div>
  );
}

function RoomContent({
  creatorId,
  roomName,
  userId,
  userName,
}: RoomContentProps) {
  const layoutContext = useCreateLayoutContext();
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [stageMode, setStageMode] = useState<StageMode>('split');
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const screenShareTracks = useTracks(
    [{ source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false },
  );
  const participants = useParticipants();
  const screenShareTrack = screenShareTracks.find((trackRef) => trackRef.publication);
  const cameraParticipantIdentities = new Set(
    cameraTracks.map((trackRef) => trackRef.participant.identity),
  );
  const agentPlaceholderTracks: TrackReferenceOrPlaceholder[] = participants
    .filter((participant) => isLiveKitAgentParticipant(participant))
    .filter((participant) => !cameraParticipantIdentities.has(participant.identity))
    .map((participant) => ({
      participant,
      source: Track.Source.Camera,
    }));
  const participantTileTracks = [...cameraTracks, ...agentPlaceholderTracks];
  const hasScreenShare = Boolean(screenShareTrack);
  const effectiveStageMode = hasScreenShare ? stageMode : 'board';
  const showBoard = effectiveStageMode === 'board' || effectiveStageMode === 'split';
  const showScreenShare = hasScreenShare && (effectiveStageMode === 'screen' || effectiveStageMode === 'split');

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
          {participantTileTracks.map((trackRef, index) => {
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
                <ConferenceParticipantTile trackRef={trackRef} />
              </div>
            );
          })}
        </div>

        <div
          style={{
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: `minmax(0, 1fr) ${isChatCollapsed ? '56px' : '300px'}`,
            gap: '10px',
            transition: 'grid-template-columns 260ms ease',
          }}
        >
          <div
            style={{
              minHeight: 0,
              position: 'relative',
              borderRadius: '10px',
              overflow: 'hidden',
              background: '#0b1220',
            }}
          >
            {hasScreenShare && (
              <div
                aria-label="Режим рабочей области"
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '4px',
                  borderRadius: '8px',
                  border: '1px solid rgba(148, 163, 184, 0.28)',
                  background: 'rgba(15, 23, 42, 0.86)',
                  boxShadow: '0 10px 24px rgba(0, 0, 0, 0.22)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {stageModes.map(({ mode, label, icon: Icon }) => {
                  const isActive = effectiveStageMode === mode;

                  return (
                    <button
                      key={mode}
                      type="button"
                      aria-label={label}
                      title={label}
                      onClick={() => setStageMode(mode)}
                      style={{
                        width: '34px',
                        height: '30px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 0,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: isActive ? '#f8fafc' : '#94a3b8',
                        background: isActive ? 'rgba(59, 130, 246, 0.92)' : 'transparent',
                      }}
                    >
                      <Icon aria-hidden="true" size={14} />
                    </button>
                  );
                })}
              </div>
            )}

            <div
              className={`conference-stage conference-stage--${effectiveStageMode}`}
              style={{
                height: '100%',
                minHeight: 0,
                display: 'grid',
                gap: effectiveStageMode === 'split' ? '10px' : 0,
                padding: effectiveStageMode === 'split' ? '0' : 0,
              }}
            >
              {showBoard && (
                <div style={{ minHeight: 0, overflow: 'hidden' }}>
                  <ExcalidrawBoard creatorIdentity={creatorId} />
                </div>
              )}

              {showScreenShare && screenShareTrack && (
                <div
                  style={{
                    minHeight: 0,
                    overflow: 'hidden',
                    border: effectiveStageMode === 'split' ? '1px solid rgba(255,255,255,0.12)' : 0,
                    background: '#020617',
                  }}
                >
                  <ConferenceParticipantTile trackRef={screenShareTrack} />
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              minHeight: 0,
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.1)',
              background: '#0b1220',
              transition: 'border-color 220ms ease, box-shadow 220ms ease',
            }}
          >
            <CustomChat
              roomName={roomName}
              userId={userId}
              userName={userName}
              isCollapsed={isChatCollapsed}
              onCollapsedChange={setIsChatCollapsed}
            />
          </div>
        </div>

        {/* Controls */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
          <ControlBar
            controls={{
              chat: false,
              screenShare: true,
              leave: true,
            }}
          />
        </div>
      </div>
    </LayoutContextProvider>
  );
}

export default function ConferenceRoom({
  roomName,
  userId,
  userName,
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
        <RoomContent
          creatorId={creatorId}
          roomName={roomName}
          userId={userId}
          userName={userName}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
