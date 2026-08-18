import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ArtistsModule } from './modules/artists/artists.module';
import { SongsModule } from './modules/songs/songs.module';
import { FilesModule } from './modules/files/files.module';
import { GoogleDriveModule } from './modules/google-drive/google-drive.module';
import { AdminModule } from './modules/admin/admin.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ArtistsModule,
    SongsModule,
    FilesModule,
    GoogleDriveModule,
    AdminModule,
    SubscriptionsModule,
    PaymentsModule,
    // ChatModule entra na Fase 2 — ver docs/arquitetura.md
  ],
})
export class AppModule {}
