'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { SceneData } from '@excalidraw/excalidraw/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { RoomEvent } from 'livekit-client';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

interface ExcalidrawBoardProps {
  creatorIdentity: string;
}

type WhiteboardScenePayload = {
  elements?: SceneData['elements'];
};

const isWhiteboardScenePayload = (value: unknown): value is WhiteboardScenePayload => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'elements' in value &&
    Array.isArray((value as { elements?: unknown }).elements)
  );
};

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false },
);

export default function ExcalidrawBoard({ creatorIdentity }: ExcalidrawBoardProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const isCreator = localParticipant.identity === creatorIdentity;
  const canEdit = isCreator;

  useEffect(() => {
    if (!room) return;

    const onDataReceived = (payload: Uint8Array, participantIdentity?: { identity?: string }) => {
      if (!excalidrawAPI || canEdit) {
        return;
      }

      if (participantIdentity?.identity !== creatorIdentity) {
        return;
      }

      try {
        const decoded = new TextDecoder().decode(payload);
        const sceneData: unknown = JSON.parse(decoded);
        
        if (isWhiteboardScenePayload(sceneData)) {
          excalidrawAPI.updateScene({ elements: sceneData.elements });
        }
      } catch (error) {
        console.error('Failed to apply whiteboard update:', error);
      }
    };

    room.on(RoomEvent.DataReceived, onDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room, excalidrawAPI, canEdit, creatorIdentity]);

  const handleChange = () => {
    if (!canEdit || !room || !excalidrawAPI) {
      return;
    }

    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
    }

    sendTimeoutRef.current = setTimeout(async () => {
      try {
        const sceneData = {
          elements: excalidrawAPI.getSceneElements(),
        };
        const payload = new TextEncoder().encode(JSON.stringify(sceneData));
        await room.localParticipant.publishData(payload);
      } catch (error) {
        console.error('Failed to send whiteboard update:', error);
      }
    }, 80);
  };

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }
    };
  }, []);

  const handleAPISetup = useCallback((api: ExcalidrawImperativeAPI) => {
    setExcalidrawAPI(api);
  }, []);

  return (
    <div className="excalidraw-container" style={{ height: '100%', border: '1px solid #ccc', position: 'relative' }}>
      {!canEdit && (
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          right: 10, 
          background: 'rgba(0,0,0,0.7)', 
          color: 'white', 
          padding: '8px 12px', 
          borderRadius: '4px',
          zIndex: 1000,
          fontSize: '14px'
        }}>
          Режим просмотра (только создатель может редактировать)
        </div>
      )}
      <Excalidraw
        excalidrawAPI={handleAPISetup}
        onChange={handleChange}
        viewModeEnabled={!canEdit}
      />
    </div>
  );
}
