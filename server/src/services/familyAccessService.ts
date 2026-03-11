import { AppDataSource } from '../data-source';
import { FamilyInvite } from '../entities/FamilyInvite';
import { FamilyAccess } from '../entities/FamilyAccess';
import { User } from '../entities/User';
import { randomBytes } from 'crypto';
import emailService from './emailService';
import { escapeHtml } from '../utils/html';

const INVITE_EXPIRY_DAYS = 7;

export class FamilyAccessService {
    /**
     * Send an invite email to the given address on behalf of the owner.
     * Returns the created FamilyInvite.
     */
    public async sendInvite(ownerUserId: string, inviteeEmail: string): Promise<FamilyInvite> {
        const inviteRepo = AppDataSource.getRepository(FamilyInvite);
        const accessRepo = AppDataSource.getRepository(FamilyAccess);
        const userRepo = AppDataSource.getRepository(User);

        const owner = await userRepo.findOneOrFail({ where: { id: ownerUserId } });

        // Check that invitee is not already a co-manager
        const currentCoManagers = await accessRepo.find({
            where: { ownerUserId },
            relations: ['coManager'],
        });
        const alreadyCoManager = currentCoManagers.some(
            a => a.coManager.email.toLowerCase() === inviteeEmail.toLowerCase()
        );
        if (alreadyCoManager) {
            const err = new Error('This person is already a co-manager') as Error & { statusCode: number };
            err.statusCode = 409;
            throw err;
        }

        // Revoke any existing pending invite for this email from this owner
        const existingPending = await inviteRepo.find({
            where: { ownerUserId, status: 'pending' },
        });
        const toRevoke = existingPending.filter(
            i => i.inviteeEmail.toLowerCase() === inviteeEmail.toLowerCase()
        );
        if (toRevoke.length > 0) {
            await inviteRepo.save(toRevoke.map(i => ({ ...i, status: 'revoked' as const })));
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

        const invite = new FamilyInvite();
        invite.ownerUserId = ownerUserId;
        invite.inviteeEmail = inviteeEmail.toLowerCase().trim();
        invite.token = token;
        invite.status = 'pending';
        invite.expiresAt = expiresAt;

        const saved = await inviteRepo.save(invite);

        // Send invite email
        const clientUrl = process.env.CLIENT_URL || 'https://kinroo.ai';
        const acceptUrl = `${clientUrl}/accept-invite?token=${token}`;
        const ownerName = `${owner.firstName} ${owner.lastName}`.trim() || owner.email;

        await emailService.sendEmail({
            to: { name: inviteeEmail, address: inviteeEmail },
            subject: `${ownerName} invited you to co-manage the family calendar`,
            text: [
                `Hi,`,
                ``,
                `${ownerName} has invited you to co-manage their family calendar on kinroo.ai.`,
                ``,
                `As a co-manager, you'll have full access to view and add events, manage family members, and stay in sync.`,
                ``,
                `Accept the invitation: ${acceptUrl}`,
                ``,
                `This link expires in ${INVITE_EXPIRY_DAYS} days.`,
            ].join('\n'),
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
    <h2 style="margin: 0;">Family Calendar Invitation</h2>
  </div>
  <div style="padding: 30px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; color: #374151;">Hi,</p>
    <p style="font-size: 16px; color: #374151;">
      <strong>${escapeHtml(ownerName)}</strong> has invited you to co-manage their family calendar on <strong>kinroo.ai</strong>.
    </p>
    <p style="font-size: 16px; color: #374151;">
      As a co-manager, you'll have full access to view and add events, manage family members, and stay in sync.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${acceptUrl}"
         style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
        Accept Invitation
      </a>
    </div>
    <p style="font-size: 14px; color: #6b7280;">This link expires in ${INVITE_EXPIRY_DAYS} days.</p>
  </div>
</div>`,
        });

        return saved;
    }

    /**
     * Validate an invite token. Returns the invite and owner's name if valid.
     */
    public async validateToken(token: string): Promise<{ invite: FamilyInvite; ownerName: string }> {
        const inviteRepo = AppDataSource.getRepository(FamilyInvite);
        const userRepo = AppDataSource.getRepository(User);

        const invite = await inviteRepo.findOne({ where: { token } });

        if (!invite) {
            const err = new Error('Invite not found') as Error & { statusCode: number };
            err.statusCode = 404;
            throw err;
        }

        if (invite.status !== 'pending') {
            const statusCode = invite.status === 'accepted' ? 409 : 410;
            const err = new Error(invite.status === 'accepted' ? 'Invite already accepted' : 'Invite has been revoked') as Error & { statusCode: number };
            err.statusCode = statusCode;
            throw err;
        }

        if (new Date() > invite.expiresAt) {
            const err = new Error('Invite has expired') as Error & { statusCode: number };
            err.statusCode = 410;
            throw err;
        }

        const owner = await userRepo.findOneOrFail({ where: { id: invite.ownerUserId } });
        const ownerName = `${owner.firstName} ${owner.lastName}`.trim() || owner.email;

        return { invite, ownerName };
    }

    /**
     * Accept an invite. Creates a family_access row and marks invite as accepted.
     * Returns the new FamilyAccess.
     */
    public async acceptInvite(token: string, inviteeUserId: string): Promise<FamilyAccess> {
        const inviteRepo = AppDataSource.getRepository(FamilyInvite);
        const accessRepo = AppDataSource.getRepository(FamilyAccess);

        const { invite } = await this.validateToken(token);

        // Prevent owner from accepting their own invite
        if (invite.ownerUserId === inviteeUserId) {
            const err = new Error('Cannot accept your own invite') as Error & { statusCode: number };
            err.statusCode = 400;
            throw err;
        }

        // Check for existing access (idempotent)
        const existing = await accessRepo.findOne({
            where: { ownerUserId: invite.ownerUserId, coManagerUserId: inviteeUserId }
        });

        if (existing) {
            await inviteRepo.update({ id: invite.id }, { status: 'accepted' });
            return existing;
        }

        const access = new FamilyAccess();
        access.ownerUserId = invite.ownerUserId;
        access.coManagerUserId = inviteeUserId;

        const savedAccess = await accessRepo.save(access);
        await inviteRepo.update({ id: invite.id }, { status: 'accepted' });

        return savedAccess;
    }

    /**
     * List pending invites for an owner.
     */
    public async listInvites(ownerUserId: string): Promise<FamilyInvite[]> {
        const inviteRepo = AppDataSource.getRepository(FamilyInvite);
        return inviteRepo.find({
            where: { ownerUserId, status: 'pending' },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * Revoke a pending invite.
     */
    public async revokeInvite(inviteId: string, ownerUserId: string): Promise<void> {
        const inviteRepo = AppDataSource.getRepository(FamilyInvite);
        const invite = await inviteRepo.findOne({ where: { id: inviteId, ownerUserId } });

        if (!invite) {
            const err = new Error('Invite not found') as Error & { statusCode: number };
            err.statusCode = 404;
            throw err;
        }

        await inviteRepo.update({ id: inviteId }, { status: 'revoked' });
    }

    /**
     * List accepted co-managers for an owner.
     */
    public async listCoManagers(ownerUserId: string): Promise<Array<{ id: string; coManagerUserId: string; name: string; email: string; createdAt: Date }>> {
        const accessRepo = AppDataSource.getRepository(FamilyAccess);
        const rows = await accessRepo.find({
            where: { ownerUserId },
            relations: ['coManager'],
            order: { createdAt: 'ASC' },
        });

        return rows.map(r => ({
            id: r.id,
            coManagerUserId: r.coManagerUserId,
            name: `${r.coManager.firstName} ${r.coManager.lastName}`.trim(),
            email: r.coManager.email,
            createdAt: r.createdAt,
        }));
    }

    /**
     * Remove a co-manager.
     */
    public async removeCoManager(accessId: string, ownerUserId: string): Promise<void> {
        const accessRepo = AppDataSource.getRepository(FamilyAccess);
        const access = await accessRepo.findOne({ where: { id: accessId, ownerUserId } });

        if (!access) {
            const err = new Error('Co-manager not found') as Error & { statusCode: number };
            err.statusCode = 404;
            throw err;
        }

        await accessRepo.remove(access);
    }

    /**
     * Look up the family_access record for a co-manager user, if any.
     */
    public async findAccessForUser(coManagerUserId: string): Promise<FamilyAccess | null> {
        const accessRepo = AppDataSource.getRepository(FamilyAccess);
        return accessRepo.findOne({
            where: { coManagerUserId },
            relations: ['owner'],
        });
    }
}

export default new FamilyAccessService();
