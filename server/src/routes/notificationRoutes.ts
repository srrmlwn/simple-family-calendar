import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Notification preferences routes
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

// Digest logs routes
router.get('/digest-logs', notificationController.getDigestLogs);
router.get('/digest-stats', notificationController.getDigestStats);

export default router; 