import { Request, Response } from 'express';
import familyAccessService from '../services/familyAccessService';

export class FamilyAccessController {
    /**
     * POST /api/family/invite
     * Owner sends an invite. Co-managers cannot invite.
     */
    public sendInvite = async (req: Request, res: Response): Promise<Response> => {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        // Co-managers cannot send invites
        if (req.user?.managingFamilyId) {
            return res.status(403).json({ error: 'Co-managers cannot send invitations' });
        }

        const { email } = req.body;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required' });
        }

        const emailTrimmed = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        try {
            const invite = await familyAccessService.sendInvite(ownerId, emailTrimmed);
            return res.status(201).json({ id: invite.id, inviteeEmail: invite.inviteeEmail, expiresAt: invite.expiresAt });
        } catch (err) {
            const e = err as Error & { statusCode?: number };
            return res.status(e.statusCode || 500).json({ error: e.message });
        }
    };

    /**
     * GET /api/family/invites
     * List pending invites for the owner.
     */
    public listInvites = async (req: Request, res: Response): Promise<Response> => {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        if (req.user?.managingFamilyId) {
            return res.status(403).json({ error: 'Co-managers cannot view invitations' });
        }

        try {
            const invites = await familyAccessService.listInvites(ownerId);
            return res.json(invites.map(i => ({
                id: i.id,
                inviteeEmail: i.inviteeEmail,
                createdAt: i.createdAt,
                expiresAt: i.expiresAt,
            })));
        } catch (err) {
            return res.status(500).json({ error: 'Failed to list invites' });
        }
    };

    /**
     * DELETE /api/family/invites/:id
     * Revoke a pending invite.
     */
    public revokeInvite = async (req: Request, res: Response): Promise<Response> => {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        if (req.user?.managingFamilyId) {
            return res.status(403).json({ error: 'Co-managers cannot revoke invitations' });
        }

        try {
            await familyAccessService.revokeInvite(req.params.id, ownerId);
            return res.status(204).send();
        } catch (err) {
            const e = err as Error & { statusCode?: number };
            return res.status(e.statusCode || 500).json({ error: e.message });
        }
    };

    /**
     * GET /api/family/co-managers
     * List accepted co-managers.
     */
    public listCoManagers = async (req: Request, res: Response): Promise<Response> => {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        if (req.user?.managingFamilyId) {
            return res.status(403).json({ error: 'Co-managers cannot view co-manager list' });
        }

        try {
            const managers = await familyAccessService.listCoManagers(ownerId);
            return res.json(managers);
        } catch (err) {
            return res.status(500).json({ error: 'Failed to list co-managers' });
        }
    };

    /**
     * DELETE /api/family/co-managers/:id
     * Remove a co-manager.
     */
    public removeCoManager = async (req: Request, res: Response): Promise<Response> => {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        if (req.user?.managingFamilyId) {
            return res.status(403).json({ error: 'Co-managers cannot remove other co-managers' });
        }

        try {
            await familyAccessService.removeCoManager(req.params.id, ownerId);
            return res.status(204).send();
        } catch (err) {
            const e = err as Error & { statusCode?: number };
            return res.status(e.statusCode || 500).json({ error: e.message });
        }
    };

    /**
     * GET /api/family/invite/validate?token=xxx
     * Public endpoint — validate token and return invite details.
     */
    public validateInvite = async (req: Request, res: Response): Promise<Response> => {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token is required' });
        }

        try {
            const { invite, ownerName } = await familyAccessService.validateToken(token);
            return res.json({
                inviteeEmail: invite.inviteeEmail,
                ownerName,
                expiresAt: invite.expiresAt,
            });
        } catch (err) {
            const e = err as Error & { statusCode?: number };
            return res.status(e.statusCode || 500).json({ error: e.message });
        }
    };

    /**
     * POST /api/family/invite/accept
     * Authenticated invitee accepts an invite.
     */
    public acceptInvite = async (req: Request, res: Response): Promise<Response> => {
        const inviteeUserId = req.user?.id;
        if (!inviteeUserId) return res.status(401).json({ error: 'Unauthorized' });

        const { token } = req.body;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token is required' });
        }

        try {
            await familyAccessService.acceptInvite(token, inviteeUserId);
            return res.json({ success: true, message: "You're now a co-manager. Please log out and log in again to access the family calendar." });
        } catch (err) {
            const e = err as Error & { statusCode?: number };
            return res.status(e.statusCode || 500).json({ error: e.message });
        }
    };
}

export default new FamilyAccessController();
