import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { ChatModule } from './modules/chat/chat.module';
import { HealthModule } from './modules/health/health.module';

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
    ChatModule,
    HealthModule,
  ],
  providers: [
    // Registrar o ThrottlerModule acima só disponibiliza a configuração — ele
    // não intercepta nada sozinho. Sem este APP_GUARD o limite de 100/min ficava
    // inerte e POST /auth/login aceitava tentativas de senha sem nenhum freio.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
