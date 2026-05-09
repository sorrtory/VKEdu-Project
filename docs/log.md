# Logging of CLI commands

This file contains a log of CLI commands that were run in the course of development.

Note: If having trouble with VS code errors. [Restart](https://stackoverflow.com/questions/78665250/unsafe-assignment-of-an-error-typed-value-typescript-eslint-error) eslint server

## Yarn

- [Source](https://gist.github.com/macx/21d444166d169f8eff09c0c2f3f0f523)
- [Official docs](https://yarnpkg.com/getting-started/install)

```bash
npm install -g corepack
corepack enable
yarn set version stable
yarn dlx @yarnpkg/sdks base vscode
# VS code: Cmd + Shift + P -> Type "Select TypeScript version" -> Select "Use workspace version"
# or select vs code prompt to use workspace version of typescript when prompted.
# Install "ZipFS" for vs code
```

## Backend yarn log

1. `npm i -g @nestjs/cli`
2. `nest new backend`

`cd apps/backend`

3. `yarn add -D @types/multer` + add to `tsconfig.json`
4. `yarn add @nestjs/microservices kafkajs` - nest js kafka [docs](https://docs.nestjs.com/microservices/kafka)
5. `yarn add livekit-server-sdk`
6. `yarn add @nestjs/swagger swagger-ui-express` + create `nest-cli.json`
7. `yarn add @nestjs/config`
8. `yarn add -D cross-env` - for setting env variables in package.json

### Prisma

> check the [schema options](./../apps/backend/prisma/schema.prisma) for nodenext

9. `yarn add @prisma/client @prisma/adapter-pg pg dotenv dotenv-expand` - [prisma](https://www.prisma.io/docs/prisma-orm/quickstart/postgresql)
10. `yarn add prisma @types/pg --dev`
11. `yarn dlx prisma init --datasource-provider postgresql --output ../generated/prisma` + `rm .env` + "install vs code prisma"
12. `yarn add -D tsx` - for running prisma seed script with tsx

### Passport

13. `yarn add @nestjs/passport passport passport-local passport-jwt`
14. `yarn add -D @types/passport-local @types/passport-jwt`
15. `yarn add bcrypt` 
16. `yarn add -D @types/bcrypt`

### swc
17. `yarn add -D @swc/core @swc/helpers @swc/cli chokidar`
18. nescli + builder flag
19. `.swcrc`

### jest

20. add [mapper](../apps/backend/test/jest-e2e.json) to befriend with prisma es module 
21. change test command to `node --experimental-vm-modules $(yarn bin jest) --config ./test/jest-e2e.json`

## Frontend yarn log

1. `yarn add next react react-dom`
2. `yarn add -D typescript @types/node @types/react @types/react-dom`
3. `yarn add livekit-client @livekit/components-react @livekit/components-styles`

## Services

### Livekit agent

1. `uv init`
2. `uv add python-dotenv`
3. 

#### Links

- [livekit docs](https://docs.livekit.io/agents/models/#inference)
