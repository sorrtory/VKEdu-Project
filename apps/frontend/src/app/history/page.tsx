'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { FaClock, FaComments, FaFileAlt, FaListUl, FaPlay, FaSearch } from 'react-icons/fa';
import { useUser } from '@/src/contexts/UserContext';
import { getGuestConferenceHistory, type ConferenceArchiveItem } from '@/src/lib/conference-history';

interface ConferenceListResponse {
  success: boolean;
  items: ConferenceArchiveItem[];
  error?: string;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Нет даты';

  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConferenceHistoryPage() {
  const [items, setItems] = useState<ConferenceArchiveItem[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, accessToken, isAuthLoading } = useUser();

  useEffect(() => {
    let isActive = true;

    async function loadConferences() {
      if (isAuthLoading) {
        return;
      }

      if (isActive) {
        setIsLoading(true);
      }

      if (!user || !accessToken) {
        if (isActive) {
          setItems(getGuestConferenceHistory());
          setError(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch('/api/conference', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const payload = (await response.json()) as ConferenceListResponse;

        if (!response.ok || !payload.success) {
          throw new Error(payload.error ?? 'Не удалось загрузить конференции');
        }

        if (isActive) {
          setItems(payload.items ?? []);
          setError(null);
        }
      } catch (requestError) {
        if (isActive) {
          setError(requestError instanceof Error ? requestError.message : 'Ошибка загрузки');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadConferences();

    return () => {
      isActive = false;
    };
  }, [accessToken, isAuthLoading, user]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;

    return items.filter((item) => {
      return [item.roomName, item.title, item.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [items, query]);

  return (
    <main className="min-h-full bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">История конференций</h1>
            <p className="mt-1 text-sm text-slate-300">
              {user
                ? 'Сохранённые чаты, саммари и расшифровки по вашим комнатам.'
                : 'Комнаты, в которые вы заходили на этом устройстве.'}
            </p>
          </div>

          <label className="flex h-11 w-full items-center gap-3 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-slate-300 md:w-80">
            <FaSearch aria-hidden="true" className="shrink-0" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Найти конференцию"
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-100">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-5 text-sm text-slate-300">
            Загружаем историю...
          </div>
        )}

        {!isLoading && filteredItems.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-8 text-center text-sm text-slate-300">
            Конференций пока нет
          </div>
        )}

        <div className="grid gap-3">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 rounded-lg border border-white/10 bg-slate-900 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{item.title || item.roomName}</h2>
                  <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {item.roomName}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <FaClock aria-hidden="true" />
                    {formatDate(item.updatedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FaComments aria-hidden="true" />
                    {item.counts.chatMessages} сообщений
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FaFileAlt aria-hidden="true" />
                    {item.counts.transcriptEntries} расшифровок
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FaListUl aria-hidden="true" />
                    {item.counts.summaryEntries} саммари
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Link
                  href={`/history/${encodeURIComponent(item.roomName)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  <FaFileAlt aria-hidden="true" />
                  Открыть
                </Link>
                <Link
                  href={`/conference/${encodeURIComponent(item.roomName)}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                >
                  <FaPlay aria-hidden="true" />
                  Продолжить
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
