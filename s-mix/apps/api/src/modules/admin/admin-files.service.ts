import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminFilesService {
  constructor(private prisma: PrismaService) {}

  create(data: { songId: string; name: string; type: string; googleDriveFileId: string; licenseId?: string }) {
    return this.prisma.file.create({ data });
  }

  update(id: string, data: { name?: string; type?: string; googleDriveFileId?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
    return this.prisma.file.update({ where: { id }, data });
  }

  listLicenses() {
    return this.prisma.license.findMany({ orderBy: { name: 'asc' } });
  }

  createLicense(data: { name: string; type: string; source?: string; notes?: string }) {
    return this.prisma.license.create({ data });
  }
}
