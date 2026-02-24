import { Router } from 'express';
import familyAccessController from '../controllers/familyAccessController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Public: validate an invite token (no auth needed — invitee may not have account yet)
router.get('/invite/validate', familyAccessController.validateInvite);

// All other routes require authentication
router.use(authenticateJWT);

// Invite management (owner only — enforced in controller)
router.post('/invite', familyAccessController.sendInvite);
router.get('/invites', familyAccessController.listInvites);
router.delete('/invites/:id', familyAccessController.revokeInvite);

// Co-manager management (owner only — enforced in controller)
router.get('/co-managers', familyAccessController.listCoManagers);
router.delete('/co-managers/:id', familyAccessController.removeCoManager);

// Accept invite (authenticated invitee)
router.post('/invite/accept', familyAccessController.acceptInvite);

export default router;
