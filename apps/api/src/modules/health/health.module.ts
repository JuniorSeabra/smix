import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { GoogleDriveModule } from '../google-drive/google-drive.module';

@Module({ imports: [GoogleDriveModule], controllers: [HealthController] })
export class HealthModule {}
