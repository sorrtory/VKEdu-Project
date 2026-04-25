'use client';

import { useEffect, useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';
import { RoomEvent } from 'livekit-client';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

interface ExcalidrawBoardProps {
  creatorIdentity: string;
}

// Type guard to check if data is valid ExcalidrawElement[]
function isExcalidrawElementArray(data: unknown): data is readonly ExcalidrawElement[] {
  if (!Array.isArray(data)) return false;
  // Basic validation - check first element has expected ExcalidrawElement properties
  if (data.length === 0) return true;
  const first = data[0];
  return (
    first !== null &&
    typeof first === 'object' &&
    'id' in first &&
    'type' in first &&
    'x' in first &&
    'y' in first
  );
}

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
        const sceneData = JSON.parse(decoded) as { elements?: unknown[] };

        if (Array.isArray(sceneData.elements) && isExcalidrawElementArray(sceneData.elements)) {
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

    // Small debounce keeps traffic low while preserving smooth updates.
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

  return (
    <div className="excalidraw-container" style={{ height: '600px', border: '1px solid #ccc', position: 'relative' }}>
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
          excalidrawAPI={(api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api)}
          onChange={handleChange}
          viewModeEnabled={!canEdit}
        />
    </div>
  );
}