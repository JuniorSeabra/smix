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

  // Monta o objeto do update campo a campo, em vez de repassar `data` inteiro.
  //
  // Segunda linha de defesa: o DTO no controller já filtra o corpo, mas quem ler
  // só este arquivo não teria como saber disso. Espalhar um objeto vindo da
  // requisição direto no `data` do Prisma é exatamente o padrão que abriu a
  // escalação de privilégio descrita em UpdateProfileDto — aqui não dá pra
  // reabrir por acidente, porque só `name` chega ao banco.
  async updateProfile(userId: string, data: { name: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: data.name },
    });
  }

  async updatePhoto(userId: string, photo: Express.Multer.File) {
    const photoUrl = await processProfilePhoto(photo.buffer, photo.mimetype);
    return this.prisma.user.update({ where: { id: userId }, data: { photoUrl } });
  }
}
