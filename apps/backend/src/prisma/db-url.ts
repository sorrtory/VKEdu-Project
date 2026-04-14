import * as dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { existsSync } from 'fs';
import {
  rootEnvFilePath,
  rootProductionEnvFilePath,
} from '../config/env-paths.js';

dotenvExpand.expand(dotenv.config({ path: rootEnvFilePath }));

if (
  process.env.NODE_ENV === 'production' &&
  existsSync(rootProductionEnvFilePath)
) {
  const prodEnv = dotenv.config({
    path: rootProductionEnvFilePath,
  });
  dotenvExpand.expand(prodEnv);
}

function getEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export function getDatasourceUrl(): string {
  const host = getEnv('BACKEND_DATABASE_HOST');
  const port = getEnv('POSTGRES_PORT');
  const database = getEnv('POSTGRES_DB');
  const user = getEnv('POSTGRES_USER');
  const password = getEnv('POSTGRES_PASSWORD');
  const schema = process.env.POSTGRES_SCHEMA ?? 'public';

  const missing = [
    ['BACKEND_DATABASE_HOST', host],
    ['POSTGRES_PORT', port],
    ['POSTGRES_DB', database],
    ['POSTGRES_USER', user],
    ['POSTGRES_PASSWORD', password],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')} in file ${rootEnvFilePath}`,
    );
  }

  return (
    `postgresql://${encodeURIComponent(user!)}:${encodeURIComponent(password!)}` +
    `@${host!}:${port!}/${database!}?schema=${encodeURIComponent(schema)}`
  );
}

export function getOptionalDatasourceUrl(): string | undefined {
  try {
    return getDatasourceUrl();
  } catch {
    return undefined;
  }
}

export const datasourceUrl = getDatasourceUrl();
