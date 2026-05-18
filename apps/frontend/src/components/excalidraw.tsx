'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { SceneData } from '@excalidraw/excalidraw/types';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import { RoomEvent } from 'livekit-client';
import { useLocalParticipant, useRoomContext } from '@livekit/components-react';

interface ExcalidrawBoardProps {
  creatorIdentity: string;
  roomName: string;
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

export default function ExcalidrawBoard({ creatorIdentity, roomName }: ExcalidrawBoardProps) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotTimeRef = useRef<number>(0);
  
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

    // Schedule board snapshot (debounced with longer interval)
    if (snapshotTimeoutRef.current) {
      clearTimeout(snapshotTimeoutRef.current);
    }

    snapshotTimeoutRef.current = setTimeout(() => {
      void submitBoardSnapshot();
    }, 2000); // Wait 2 seconds after last change before capturing
  };

  const submitBoardSnapshot = async () => {
    if (!canEdit || !excalidrawAPI) {
      return;
    }

    try {
      // Prevent sending snapshots too frequently (max once per 5 seconds)
      const now = Date.now();
      if (now - lastSnapshotTimeRef.current < 5000) {
        return;
      }
      lastSnapshotTimeRef.current = now;

      // Export canvas as PNG blob
      const canvas = document.querySelector(
        '.excalidraw-container canvas'
      ) as HTMLCanvasElement;

      if (!canvas) {
        console.warn('Canvas element not found');
        return;
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('Failed to create canvas blob');
          return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
          const base64 = (event.target?.result as string).split(',')[1]; // Remove data:image/png;base64, prefix
          if (!base64) {
            console.error('Failed to convert canvas to base64');
            return;
          }

          try {
            const response = await fetch('/api/conference/board/snapshot', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                conferenceId: roomName,
                imageBase64: base64,
              }),
            });

            if (!response.ok) {
              console.error('Failed to submit board snapshot:', response.statusText);
            }
          } catch (error) {
            console.error('Failed to submit board snapshot:', error);
          }
        };
        reader.readAsDataURL(blob);
      }, 'image/png', 0.8);
    } catch (error) {
      console.error('Failed to capture board snapshot:', error);
    }
  };

  useEffect(() => {
    return () => {
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
      }
      if (snapshotTimeoutRef.current) {
        clearTimeout(snapshotTimeoutRef.current);
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
