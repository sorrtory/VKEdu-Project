import type { Request } from 'express';
import type { AuthUser } from './auth-user.type.js';

export type RequestWithUser = Request & {
  user: AuthUser;
};
