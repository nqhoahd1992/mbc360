import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { RolePermissionsController } from './role-permissions.controller';

@Module({
  controllers: [AdminUsersController, RolePermissionsController],
})
export class AdminModule {}
