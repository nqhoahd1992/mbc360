import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { RolePermissionsController } from './role-permissions.controller';
import { VerificationModule } from '../verification/verification.module';

// VerificationModule is imported for TotpService — the admin reset of a user's
// authenticator, the recovery path for a lost device.
@Module({
  imports: [VerificationModule],
  controllers: [AdminUsersController, RolePermissionsController],
})
export class AdminModule {}
