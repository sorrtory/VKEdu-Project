'use client';

import { useEffect, useMemo, useState } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { VideoConference } from '@livekit/components-react/prefabs';
import '@livekit/components-styles';

export default function RoomPage() {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const roomName = process.env.NEXT_PUBLIC_LIVEKIT_ROOM ?? 'my-room';
  const username = useMemo(() => {
    const randomSegment =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    return `user-${randomSegment}`;
  }, []);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchToken() {
      setError(null);
      setToken(null);

      try {
        const params = new URLSearchParams({ room: roomName, username });
        const response = await fetch(`/api/livekit/token?${params}`, {
          signal: controller.signal,
        });

        const rawBody = await response.text();

        if (!response.ok) {
          throw new Error(rawBody || 'Сервер вернул ошибку при выдаче токена');
        }

        let payload: { token?: string } | null = null;

        try {
          payload = JSON.parse(rawBody);
        } catch {
          throw new Error('Некорректный ответ сервера LiveKit (ожидался JSON)');
        }

        if (!payload?.token) {
          throw new Error('Ответ сервера не содержит token');
        }

        if (isMounted) {
          setToken(payload.token);
        }
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Неизвестная ошибка при получении токена'
          );
        }
      }
    }

    fetchToken();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [reloadKey, roomName, username]);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!livekitUrl) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 p-6 text-center text-sm text-white">
        Укажите переменную окружения NEXT_PUBLIC_LIVEKIT_URL с адресом LiveKit.
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center text-white">
        <p className="text-sm font-semibold">Не удалось получить токен</p>
        <p className="text-xs text-slate-300">{error}</p>
        <button
          className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/20"
          onClick={() => setReloadKey(value => value + 1)}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-white">
        Запрашиваем токен LiveKit...
      </div>
    );
  }

  return (
    <LiveKitRoom token={token} serverUrl={livekitUrl} connect audio video data-lk-theme="default">
      <VideoConference />
    </LiveKitRoom>
  );
}