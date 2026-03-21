import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "http://localhost:3000/send";

export async function POST(request: NextRequest) {
  try {
    const incomingFormData = await request.formData();
    const file = incomingFormData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ message: "Файл не найден" }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("file", file, file.name);

    const response = await fetch(BACKEND_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { message: "Бэкэнд вернул ошибку", details: text },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: "Скриншот отправлен" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Ошибка при отправке на бэк", details: `${error}` },
      { status: 500 }
    );
  }
}
