import type { Roles } from '@/common/types/roles';

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  role?: Roles;
  password?: string;
}
