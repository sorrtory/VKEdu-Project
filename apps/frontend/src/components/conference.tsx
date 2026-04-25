'use client';

import {
  ControlBar,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react';
import '@livekit/components-styles';
import ExcalidrawBoard from '@/src/components/excalidraw';
import { useRouter } from 'next/navigation';
import { Track } from 'livekit-client';
import type { ComponentProps } from 'react';

type ParticipantTrackRef = ComponentProps<typeof ParticipantTile>['trackRef'];

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
  const cameraTracks: ParticipantTrackRef[] = useTracks(
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
          </div>

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}