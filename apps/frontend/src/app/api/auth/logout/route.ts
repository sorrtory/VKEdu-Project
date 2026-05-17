import { NextRequest, NextResponse } from "next/server";
import { getBackendAuthUrl, getJsonPayload } from "../shared";

interface LogoutBody {
  refreshToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<LogoutBody>;
    const response = await fetch(`${getBackendAuthUrl()}/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: body.refreshToken }),
    });

    const payload = await getJsonPayload(response);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при выходе' },
      { status: 500 },
    );
  }
}