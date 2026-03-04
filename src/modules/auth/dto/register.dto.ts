import type { Roles } from '@/common/types/roles';

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Roles;
}
