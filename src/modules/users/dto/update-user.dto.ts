import type { Roles } from '@/common/types/roles';

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: Roles;
  status?: string;
}
