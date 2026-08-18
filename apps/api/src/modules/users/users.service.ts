import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { processProfilePhoto } from '../../common/utils/profile-photo';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        role: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    return user;
  }

  async updateProfile(userId: string, data: { name?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async updatePhoto(userId: string, photo: Express.Multer.File) {
    const photoUrl = await processProfilePhoto(photo.buffer, photo.mimetype);
    return this.prisma.user.update({ where: { id: userId }, data: { photoUrl } });
  }
}
