'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { FaArrowLeft, FaComments, FaFileAlt, FaListUl, FaPlay } from 'react-icons/fa';

type HistoryTab = 'chat' | 'transcript' | 'summary';

interface ChatItem {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: 'chat' | 'ai' | 'speaker' | 'system';
  text: string;
  createdAt: string;
}

interface StreamItem {
  id: string;
  roomId: string;
  text: string;
  createdAt: string;
  speakerName?: string | null;
  source?: string;
}

interface HistoryResponse<T> {
  success: boolean;
  items: T[];
  error?: string;
}

const tabLabels: Record<HistoryTab, string> = {
  chat: 'Чат',
  transcript: 'Расшифровка',
  summary: 'Саммари',
};

const tabIcons: Record<HistoryTab, typeof FaComments> = {
  chat: FaComments,
  transcript: FaFileAlt,
  summary: FaListUl,
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ConferenceHistoryDetailPage() {
  const params = useParams();
  const conferenceName = String(params.conferenceName ?? '');
  const decodedConferenceName = decodeURIComponent(conferenceName);
  const [activeTab, setActiveTab] = useState<HistoryTab>('summary');
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [transcriptItems, setTranscriptItems] = useState<StreamItem[]>([]);
  const [summaryItems, setSummaryItems] = useState<StreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadHistory() {
      try {
        const encodedName = encodeURIComponent(decodedConferenceName);
        const [chatResponse, transcriptResponse, summaryResponse] = await Promise.all([
          fetch(`/api/conference/${encodedName}/chat`),
          fetch(`/api/conference/${encodedName}/transcript`),
          fetch(`/api/conference/${encodedName}/summary`),
        ]);

        const [chat, transcript, summary] = await Promise.all([
          chatResponse.json() as Promise<HistoryResponse<ChatItem>>,
          transcriptResponse.json() as Promise<HistoryResponse<StreamItem>>,
          summaryResponse.json() as Promise<HistoryResponse<StreamItem>>,
        ]);

        if (!chatResponse.ok || !transcriptResponse.ok || !summaryResponse.ok) {
          throw new Error(chat.error ?? transcript.error ?? summary.error ?? 'Не удалось загрузить историю');
        }

        if (isActive) {
          setChatItems(chat.items ?? []);
          setTranscriptItems(transcript.items ?? []);
          setSummaryItems(summary.items ?? []);
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

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [decodedConferenceName]);

  const currentItems = useMemo(() => {
    if (activeTab === 'chat') return chatItems;
    if (activeTab === 'transcript') return transcriptItems;
    return summaryItems;
  }, [activeTab, chatItems, summaryItems, transcriptItems]);

  return (
    <main className="min-h-full bg-slate-950 px-5 py-6 text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link
              href="/history"
              className="mb-3 inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-white"
            >
              <FaArrowLeft aria-hidden="true" />
              К архиву
            </Link>
            <h1 className="truncate text-2xl font-semibold">{decodedConferenceName}</h1>
            <p className="mt-1 text-sm text-slate-300">Сохранённая история конференции</p>
          </div>

          <Link
            href={`/conference/${encodeURIComponent(decodedConferenceName)}`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <FaPlay aria-hidden="true" />
            Продолжить конференцию
          </Link>
        </div>

        <div className="grid grid-cols-3 rounded-lg border border-white/10 bg-slate-900 p-1">
          {(Object.keys(tabLabels) as HistoryTab[]).map((tab) => {
            const Icon = tabIcons[tab];
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex h-10 min-w-0 items-center justify-center gap-2 rounded-md px-2 text-sm transition ${
                  isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon aria-hidden="true" className="shrink-0" />
                <span className="truncate">{tabLabels[tab]}</span>
              </button>
            );
          })}
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

        {!isLoading && currentItems.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-slate-900 p-8 text-center text-sm text-slate-300">
            В этом разделе пока нет данных
          </div>
        )}

        <div className="flex flex-col gap-3">
          {activeTab === 'chat' &&
            chatItems.map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">{item.senderName || 'unknown'}</span>
                  <span>{item.senderType}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{item.text}</p>
              </article>
            ))}

          {activeTab !== 'chat' &&
            (currentItems as StreamItem[]).map((item) => (
              <article key={item.id} className="rounded-lg border border-white/10 bg-slate-900 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {item.speakerName && <span className="font-semibold text-slate-200">{item.speakerName}</span>}
                  {item.source && <span>{item.source}</span>}
                  <span>{formatDate(item.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{item.text}</p>
              </article>
            ))}
        </div>
      </div>
    </main>
  );
}
