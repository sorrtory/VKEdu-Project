'use client';

import { useEffect, useState } from 'react';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

export default function RoomPage() {
  const [token, setToken] = useState('');

  useEffect(() => {
    fetch('http://localhost:3001/livekit/token?room=my-room&username=user1')
      .then(res => res.json())
      .then(data => setToken(data.token));
  }, []);

  if (!token) return <div>Getting token...</div>;

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={true}
    >
      <VideoConference />
    </LiveKitRoom>
  );
}