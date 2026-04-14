import { existsSync } from 'fs';
import path from 'path';

// One for Prisma ESM support, one for regular CJS support

function isRepoRoot(dir) {
  return (
    existsSync(path.join(dir, '.env.example')) &&
    existsSync(path.join(dir, 'package.json')) &&
    existsSync(path.join(dir, 'apps', 'backend', 'package.json'))
  );
}

function findRepoRoot(startDirs) {
  for (const startDir of startDirs) {
    let currentDir = path.resolve(startDir);

    while (true) {
      if (isRepoRoot(currentDir)) {
        return currentDir;
      }

      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }

      currentDir = parentDir;
    }
  }

  throw new Error('Unable to locate the repository root for backend env files');
}

export const repoRoot = findRepoRoot([process.cwd(), __dirname]);
export const rootEnvFilePath = path.join(repoRoot, '.env');
export const rootProductionEnvFilePath = path.join(repoRoot, '.env.production');

export function getBackendEnvFilePaths(nodeEnv) {
  if (nodeEnv === 'production') {
    return [];
  }

  const envFilePaths = [rootEnvFilePath];
  if (nodeEnv) {
    const modeEnvFilePath = path.join(repoRoot, `.env.${nodeEnv}`);
    if (existsSync(modeEnvFilePath)) {
      envFilePaths.push(modeEnvFilePath);
    }
  }

  return envFilePaths;
}
