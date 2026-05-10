export function createFallbackUserName(): string {
  const randomSegment =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `user-${randomSegment}`;
}

