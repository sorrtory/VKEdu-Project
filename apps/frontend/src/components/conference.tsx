'use client';

import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  TrackLoop,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import ExcalidrawBoard from '@/src/components/excalidraw';
import { useRouter } from 'next/navigation';
import { Track } from 'livekit-client';
import type { ComponentProps } from 'react';

type ParticipantTileTrackRef = ComponentProps<typeof ParticipantTile>['trackRef'];

interface ConferenceRoomProps {
  roomName: string;
  userName: string;
  userId: string;
  serverUrl: string;
  token: string;
  creatorId: string;
}

export default function ConferenceRoom({
  roomName,
  userName,
  userId,
  serverUrl,
  token,
  creatorId,
}: ConferenceRoomProps) {
  const router = useRouter();
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );

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
          <div
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              overflowY: 'hidden',
              paddingBottom: '4px',
            }}
          >
            <TrackLoop tracks={cameraTracks}>
              {(trackRef: ParticipantTileTrackRef) => (
                <div
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
              )}
            </TrackLoop>
          </div>

          <div style={{ minHeight: 0, borderRadius: '10px', overflow: 'hidden' }}>
            <ExcalidrawBoard creatorIdentity={creatorId} />
          </div>

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

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}