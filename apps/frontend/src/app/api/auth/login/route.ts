import { NextRequest, NextResponse } from "next/server";
import { getBackendAuthUrl, getJsonPayload } from "../shared";

interface LoginBody {
  email: string;
  password: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<LoginBody>;
    const response = await fetch(`${getBackendAuthUrl()}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
      }),
    });

    const payload = await getJsonPayload(response);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: 'Ошибка при авторизации' },
      { status: 500 },
    );
  }
}