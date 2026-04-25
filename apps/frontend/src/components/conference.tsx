'use client';

import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import ExcalidrawBoard from '@/src/components/excalidraw';
import { useRouter } from 'next/navigation';

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
    <div className="conference-wrapper" style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect={true}
        audio={true}
        video={true}
        data-lk-theme="default"
        onDisconnected={handleDisconnect}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
          <div style={{ flex: '0 0 auto' }}>
            <VideoConference />
          </div>
          
          <div style={{ flex: 1, margin: '10px', borderRadius: '8px', overflow: 'hidden' }}>
            <ExcalidrawBoard creatorIdentity={creatorId} />
          </div>
        </div>
        
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}