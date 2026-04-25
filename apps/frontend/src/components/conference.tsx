'use client';

import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useRouter } from 'next/navigation';
import ExcalidrawBoard from './excalidraw';

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

  const handleDisconnect = () => {
    router.push('/');
  };

  return (
    <div className="conference-wrapper" style={{ height: '100vh', width: '100vw' }}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={true}
        video={true}
        data-lk-theme="default"
        onDisconnected={handleDisconnect}
      >
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <VideoConference />
            <RoomAudioRenderer />
          </div>
          
          <div style={{ width: '600px', borderLeft: '2px solid #ccc', padding: '10px' }}>
            <ExcalidrawBoard creatorIdentity={creatorId} />
          </div>
        </div>
      </LiveKitRoom>
    </div>
  );
}