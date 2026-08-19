import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminFilesService } from './admin-files.service';
import { AdminFilesController } from './admin-files.controller';
import { GoogleDriveModule } from '../google-drive/google-drive.module';

@Module({
  imports: [GoogleDriveModule],
  controllers: [AdminController, AdminFilesController],
  providers: [AdminService, AdminFilesService],
})
export class AdminModule {}
