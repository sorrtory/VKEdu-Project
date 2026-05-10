import { getBackendUrl } from "../shared";

export function getBackendAuthUrl(): string {
  return getBackendUrl("auth");
}

export async function getJsonPayload(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return { error: 'Empty response from backend' };
  }
}
