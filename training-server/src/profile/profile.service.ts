import { 
  BadRequestException, 
  ConflictException, 
  Injectable, 
  NotFoundException 
} from '@nestjs/common';
import { FILE_RULES, FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Role } from '../generated/enums';
import { Prisma } from '../generated/client';

export interface ProfileUploads {
  picture?: Express.Multer.File;
  certificationFile?: Express.Multer.File;
}

const NEEDS_CERT_FILE = 'Upload your previous certification (PDF or PNG).';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private files: FilesService,
  ) {}

  /** Company and previous-certification details only apply to learners */
  private assertLearnerFields(
    role: Role,
    dto: { company?: string; hasPreviousCertification?: boolean },
    up: ProfileUploads,
  ) {
    if (role !== Role.USER && (dto.company || dto.hasPreviousCertification !== undefined || up.certificationFile)) {
      throw new BadRequestException('Company and certification details do not apply to admin accounts.');
    }
  }

  async complete(userId: string, role: Role, dto: CompleteProfileDto, up: ProfileUploads) {
    this.assertLearnerFields(role, dto, up);
    const existing = await this.prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (existing) throw new ConflictException('Profile already completed. Use PATCH /profile to edit it.');

    if (dto.hasPreviousCertification && !up.certificationFile) throw new BadRequestException(NEEDS_CERT_FILE);
    if (!dto.hasPreviousCertification && up.certificationFile) {
      throw new BadRequestException('A certification file was uploaded but hasPreviousCertification is false.');
    }

    const saved: string[] = [];
    try {
      const picture = up.picture ? await this.files.save(up.picture, FILE_RULES.image) : null;
      if (picture) saved.push(picture.id);
      const cert = up.certificationFile
        ? await this.files.save(up.certificationFile, FILE_RULES.certification)
        : null;
      if (cert) saved.push(cert.id);

      await this.prisma.profile.create({
        data: {
          userId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          company: dto.company || null,
          hasPreviousCertification: dto.hasPreviousCertification,
          pictureFileId: picture?.id,
          certificationFileId: cert?.id,
        },
      });
    } catch (err) {
      await this.files.deleteMany(saved); // don't leave orphaned uploads behind
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Profile already completed. Use PATCH /profile to edit it.');
      }
      throw err;
    }
    return this.view(userId);
  }

  async view(userId: string) {
    const p = await this.prisma.profile.findUnique({
      where: { userId },
      include: { user: { select: { email: true, role: true } } },
    });
    if (!p) throw new NotFoundException('Profile not completed yet');

    return {
      id: p.id,
      email: p.user.email,
      role: p.user.role,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: p.phone,
      company: p.company,
      hasPreviousCertification: p.hasPreviousCertification,
      pictureUrl: p.pictureFileId ? '/profile/picture' : null,
      // Shown as soon as a file is uploaded: PENDING (waiting for review), APPROVED, or REJECTED (with the reason)
      ...(p.hasPreviousCertification && p.certificationFileId
        ? {
            certification: {
              status: p.certificationApproved ? 'APPROVED' : p.certificationRejectedAt ? 'REJECTED' : 'PENDING',
              approvedAt: p.certificationApprovedAt,
              rejectionReason: p.certificationRejectionReason,
              fileUrl: '/profile/certification-file',
            },
          }
        : {}),
    };
  }

  /** Same as view(), but null instead of an error when the profile is not completed yet. */
  async viewOrNull(userId: string) {
    try {
      return await this.view(userId);
    } catch (err) {
      if (err instanceof NotFoundException) return null;
      throw err;
    }
  }

  async update(userId: string, role: Role, dto: UpdateProfileDto, up: ProfileUploads) {
    this.assertLearnerFields(role, dto, up);
    const p = await this.prisma.profile.findUnique({ where: { userId } });
    if (!p) throw new NotFoundException('Complete your profile first');

    const hasCert = dto.hasPreviousCertification ?? p.hasPreviousCertification;
    if (!hasCert && up.certificationFile) {
      throw new BadRequestException('A certification file was uploaded but hasPreviousCertification is false.');
    }
    if (hasCert && !up.certificationFile && !p.certificationFileId) throw new BadRequestException(NEEDS_CERT_FILE);

    const data: Prisma.ProfileUncheckedUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      company: dto.company === undefined ? undefined : dto.company || null,
    };
    const created: string[] = [];
    const replaced: string[] = [];

    try {
      if (up.picture) {
        const f = await this.files.save(up.picture, FILE_RULES.image);
        created.push(f.id);
        if (p.pictureFileId) replaced.push(p.pictureFileId);
        data.pictureFileId = f.id;
      }

      if (dto.hasPreviousCertification !== undefined) data.hasPreviousCertification = hasCert;

      if (!hasCert) {
        // "No previous certification": drop any file and approval
        if (p.certificationFileId) replaced.push(p.certificationFileId);
        data.certificationFileId = null;
        data.certificationApproved = false;
        data.certificationApprovedAt = null;
      } else if (up.certificationFile) {
        // A new file always needs a fresh admin approval
        const f = await this.files.save(up.certificationFile, FILE_RULES.certification);
        created.push(f.id);
        if (p.certificationFileId) replaced.push(p.certificationFileId);
        data.certificationFileId = f.id;
        data.certificationApproved = false;
        data.certificationApprovedAt = null;
      }

      await this.prisma.profile.update({ where: { userId }, data });
    } catch (err) {
      await this.files.deleteMany(created);
      throw err;
    }

    await this.files.deleteMany(replaced);
    return this.view(userId);
  }

  async pictureFileId(userId: string) {
    const p = await this.prisma.profile.findUnique({ where: { userId }, select: { pictureFileId: true } });
    if (!p?.pictureFileId) throw new NotFoundException('No profile picture');
    return p.pictureFileId;
  }

  async certificationFileId(userId: string) {
    const p = await this.prisma.profile.findUnique({ where: { userId }, select: { certificationFileId: true } });
    if (!p?.certificationFileId) throw new NotFoundException('No certification file');
    return p.certificationFileId;
  }
}
