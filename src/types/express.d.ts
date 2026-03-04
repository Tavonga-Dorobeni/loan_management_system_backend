import 'express';
import type { Roles } from '@/common/types/roles';

declare global {
  namespace Express {
    interface UserContext {
      id: number;
      email: string;
      role: Roles;
    }

    interface Request {
      user?: UserContext;
    }
  }
}

export {};
