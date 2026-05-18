import { ParticipantKind, type Participant } from 'livekit-client';

const configuredAgentName = process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME?.trim();

export function isLiveKitAgentParticipant(
  participant: Pick<Participant, 'identity' | 'name' | 'isAgent' | 'kind'>,
) {
  if (participant.isAgent || participant.kind === ParticipantKind.AGENT) {
    return true;
  }

  if (!configuredAgentName) {
    return false;
  }

  return (
    participant.identity === configuredAgentName ||
    participant.name === configuredAgentName
  );
}

export function getAgentParticipantLabel(
  participant: Pick<Participant, 'identity' | 'name'>,
) {
  return participant.name?.trim() || participant.identity || 'Агент';
}
