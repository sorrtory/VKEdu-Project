'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  ControlBar,
  RoomAudioRenderer,
  useTracks,
  PreJoin,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { useRouter } from 'next/navigation';

interface ConferenceRoomProps {
  roomName: string;
  userName: string;
  userId: string;
  serverUrl: string;
  token: string;
}

export default function ConferenceRoom({
  roomName,
  userName,
  userId,
  serverUrl,
  token,
}: ConferenceRoomProps) {
    const router = useRouter();

    // const tracks = useTracks(

    // )

    const handleDisconnect = ()=> {
        router.push('/')
    }

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
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}