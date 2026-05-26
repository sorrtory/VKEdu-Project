import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "../../shared";

export async function POST(request: NextRequest) {
  try {
    const { conferenceName, participantIdentity, participantName } =
      await request.json();
    const response = await fetch(getBackendUrl("conference/token"), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conferenceName,
        participantIdentity,
        participantName,
        agentName: process.env.NEXT_PUBLIC_LIVEKIT_AGENT_NAME,
      }),
    });

    const result: { token?: string; creatorId?: string } = await response.json();

    return NextResponse.json({ token: result.token, creatorId: result.creatorId });
  } catch (error) {
    console.error('[livekit/token] proxy failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Ошибка при получении токена' },
      { status: 500 },
    );
  }
}
