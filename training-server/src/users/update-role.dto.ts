import { IsEnum } from 'class-validator';
import { Role } from '../generated/enums';

export class UpdateRoleDto {
  @IsEnum(Role)
  role!: Role;
}
