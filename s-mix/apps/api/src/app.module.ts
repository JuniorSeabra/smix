import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ArtistsModule } from './modules/artists/artists.module';
import { SongsModule } from './modules/songs/songs.module';
import { FilesModule } from './modules/files/files.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ArtistsModule,
    SongsModule,
    FilesModule,
    AdminModule,
    // SubscriptionsModule, PaymentsModule, ChatModule
    // entram conforme a Fase 1 avança — ver docs/arquitetura.md
  ],
})
export class AppModule {}
