'use client';

import { useEffect, useState } from 'react';
import ConferenceRoom from '@/src/components/conference';
import { useParams } from 'next/navigation';
import { useUser } from '@/src/contexts/UserContext';
import { useGuestParticipant } from '@/src/lib/livekit';
import { rememberGuestConference } from '@/src/lib/conference-history';

export default function ConferenceRoomPage() {
  const [token, setToken] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { user, accessToken, isAuthLoading } = useUser();
  const guest = useGuestParticipant();

  const params = useParams();
  const roomName = params.conferenceName as string;

  const isParticipantLoading = isAuthLoading || (!user && !guest);
  const participantName = user?.nickname?.trim() || guest?.name || '';
  const participantIdentity = user?.userId ?? guest?.identity ?? '';

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function fetchToken() {
      if (isParticipantLoading) {
        return;
      }

      setError(null);
      setToken(null);
      setCreatorId(null);

      try {
        const response = await fetch('/api/conference/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            participantName,
            participantIdentity,
            conferenceName: roomName,
          }),
        });

        const rawBody = await response.text();

        if (!response.ok) {
          throw new Error(rawBody || 'Сервер вернул ошибку при выдаче токена');
        }

        let payload: { token?: string; creatorId?: string } | null = null;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          throw new Error('Некорректный ответ сервера LiveKit (ожидался JSON)');
        }

        if (!payload?.token || !payload.creatorId) {
          throw new Error('Ответ сервера не содержит token или creatorId');
        }

        if (isMounted) {
          setToken(payload.token);
          setCreatorId(payload.creatorId);
          if (!user) {
            rememberGuestConference(roomName);
          }
        }
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if (isMounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : 'Неизвестная ошибка при получении токена',
          );
        }
      }
    }

    fetchToken();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [accessToken, isParticipantLoading, participantIdentity, participantName, reloadKey, roomName, user]);

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!serverUrl) {
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
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  if (isParticipantLoading || !token || !creatorId) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-sm text-white">
        Запрашиваем токен LiveKit...
      </div>
    );
  }

  return (
    <ConferenceRoom
      roomName={roomName}
      userId={participantIdentity}
      userName={participantName}
      serverUrl={serverUrl}
      token={token}
      creatorId={creatorId}
    />
  );
}
