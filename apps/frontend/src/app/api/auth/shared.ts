const DEFAULT_BACKEND_HOST = 'http://backend';
const DEFAULT_BACKEND_PORT = '3000';

export function getBackendAuthUrl(): string {
  const backendHost = process.env.BACKEND_HOST ?? DEFAULT_BACKEND_HOST;
  const backendPort = process.env.BACKEND_PORT ?? DEFAULT_BACKEND_PORT;

  return `${backendHost}:${backendPort}/auth`;
}

export async function getJsonPayload(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return { error: 'Empty response from backend' };
  }
}