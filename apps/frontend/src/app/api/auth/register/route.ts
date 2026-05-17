import { NextRequest, NextResponse } from "next/server";
import { getBackendAuthUrl, getJsonPayload } from "../shared";

interface RegisterBody {
  email: string;
  password: string;
  nickname: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RegisterBody>;
    const response = await fetch(`${getBackendAuthUrl()}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        nickname: body.nickname,
      }),
    });

    const payload = await getJsonPayload(response);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при регистрации' },
      { status: 500 },
    );
  }
}