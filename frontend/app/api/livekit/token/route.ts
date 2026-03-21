import { NextRequest, NextResponse } from "next/server";

const DEFAULT_TOKEN_URL = "http://localhost:3000/livekit/token";
const LIVEKIT_TOKEN_URL = process.env.LIVEKIT_TOKEN_URL ?? DEFAULT_TOKEN_URL;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const room = searchParams.get("room");
    const username = searchParams.get("username");

    if (!room || !username) {
      return NextResponse.json(
        { message: "Параметры room и username обязательны" },
        { status: 400 }
      );
    }

    const targetUrl = new URL(LIVEKIT_TOKEN_URL);
    targetUrl.searchParams.set("room", room);
    targetUrl.searchParams.set("username", username);

    const backendResponse = await fetch(targetUrl.toString());
    const rawBody = await backendResponse.text();

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: "Бэкэнд вернул ошибку при получении токена", details: rawBody },
        { status: backendResponse.status }
      );
    }

    let payload: { token?: string } | null = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { message: "Некорректный ответ бэкэнда", details: rawBody },
        { status: 502 }
      );
    }

    if (!payload?.token) {
      return NextResponse.json(
        { message: "Ответ бэкэнда не содержит token" },
        { status: 502 }
      );
    }

    return NextResponse.json({ token: payload.token });
  } catch (error) {
    console.error("LiveKit token proxy error", error);
    return NextResponse.json(
      { message: "Не удалось получить токен", details: `${error}` },
      { status: 500 }
    );
  }
}
