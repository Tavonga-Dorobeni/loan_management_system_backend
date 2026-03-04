import type { Roles } from '@/common/types/roles';

export interface UserResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Roles;
  status: string;
  createdAt: string;
  updatedAt: string;
}
