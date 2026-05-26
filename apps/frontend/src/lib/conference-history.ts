'use client';

export interface ConferenceArchiveItem {
  id: string;
  roomName: string;
  title: string;
  description?: string | null;
  startedAt?: string | null;
  updatedAt: string;
  counts: {
    chatMessages: number;
    transcriptEntries: number;
    summaryEntries: number;
    attachments: number;
  };
}

const GUEST_CONFERENCE_HISTORY_KEY = 'bb_guest_conference_history';
const MAX_GUEST_HISTORY_ITEMS = 50;

function emptyCounts(): ConferenceArchiveItem['counts'] {
  return {
    chatMessages: 0,
    transcriptEntries: 0,
    summaryEntries: 0,
    attachments: 0,
  };
}

function isConferenceArchiveItem(value: unknown): value is ConferenceArchiveItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Partial<ConferenceArchiveItem>;
  return typeof item.id === 'string' && typeof item.roomName === 'string';
}

export function getGuestConferenceHistory(): ConferenceArchiveItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = window.localStorage.getItem(GUEST_CONFERENCE_HISTORY_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isConferenceArchiveItem) : [];
  } catch {
    return [];
  }
}

export function rememberGuestConference(roomName: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedRoomName = roomName.trim();
  if (!normalizedRoomName) {
    return;
  }

  const now = new Date().toISOString();
  const existingItems = getGuestConferenceHistory().filter(
    (item) => item.roomName !== normalizedRoomName,
  );
  const nextItems: ConferenceArchiveItem[] = [
    {
      id: `guest:${normalizedRoomName}`,
      roomName: normalizedRoomName,
      title: normalizedRoomName,
      description: null,
      startedAt: now,
      updatedAt: now,
      counts: emptyCounts(),
    },
    ...existingItems,
  ].slice(0, MAX_GUEST_HISTORY_ITEMS);

  window.localStorage.setItem(
    GUEST_CONFERENCE_HISTORY_KEY,
    JSON.stringify(nextItems),
  );
}
