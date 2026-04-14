import { defineConfig } from 'prisma/config';
import { getOptionalDatasourceUrl } from './src/prisma/db-url.ts';

const datasourceUrl = getOptionalDatasourceUrl();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'yarn tsx prisma/seed.ts',
  },
  ...(datasourceUrl
    ? {
        datasource: {
          url: datasourceUrl,
        },
      }
    : {}),
});
