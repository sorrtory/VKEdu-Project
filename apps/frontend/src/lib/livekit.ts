import { useSyncExternalStore } from "react";

interface GuestParticipant {
  identity: string;
  name: string;
}

const GUEST_ID_STORAGE_KEY = "bb_guest_participant_id";
const GUEST_NAME_STORAGE_KEY = "bb_guest_participant_name";

let cachedGuestParticipant: GuestParticipant | null = null;

function createRandomSegment(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}

export function createFallbackUserName(): string {
  return `user-${createRandomSegment()}`;
}

function createGuestParticipant(): GuestParticipant {
  const segment = createRandomSegment();

  return {
    identity: `guest:${segment}`,
    name: `user-${segment}`,
  };
}

export function getOrCreateGuestParticipant(): GuestParticipant {
  if (cachedGuestParticipant) {
    return cachedGuestParticipant;
  }

  const storedIdentity = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
  const storedName = window.localStorage.getItem(GUEST_NAME_STORAGE_KEY);

  if (storedIdentity && storedName) {
    cachedGuestParticipant = {
      identity: storedIdentity,
      name: storedName,
    };
    return cachedGuestParticipant;
  }

  const guest = createGuestParticipant();
  window.localStorage.setItem(GUEST_ID_STORAGE_KEY, guest.identity);
  window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, guest.name);
  cachedGuestParticipant = guest;

  return cachedGuestParticipant;
}

export function useGuestParticipant(): GuestParticipant | null {
  return useSyncExternalStore(
    () => () => undefined,
    getOrCreateGuestParticipant,
    () => null,
  );
}
