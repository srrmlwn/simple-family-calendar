// src/routes/googleCalendar.ts
import { Router, Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import { authenticateJWT } from '../middleware/auth';
import { googleCalendarService } from '../services/GoogleCalendarService';

const router = Router();

// GET /api/google-calendar/connect — redirect to Google OAuth (JWT protected)
router.get('/connect', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id as string;
    const email = (req.user as any)?.email as string | undefined;
    const authUrl = googleCalendarService.getAuthUrl(userId, email);
    res.redirect(authUrl);
}));

// GET /api/google-calendar/callback — public, called by Google after OAuth consent
router.get('/callback', asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error } = req.query as Record<string, string>;

    const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

    if (error) {
        return res.redirect(`${CLIENT_URL}?google_calendar_error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
        return res.redirect(`${CLIENT_URL}?google_calendar_error=missing_params`);
    }

    const redirectUrl = await googleCalendarService.handleCallback(code, state);
    res.redirect(redirectUrl);
}));

// POST /api/google-calendar/import — run import for authenticated user
router.post('/import', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id as string;
    const result = await googleCalendarService.importEvents(userId);
    res.json(result);
}));

// GET /api/google-calendar/status — check if connected
router.get('/status', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id as string;
    const connected = await googleCalendarService.isConnected(userId);
    res.json({ connected });
}));

// DELETE /api/google-calendar/disconnect — remove stored tokens
router.delete('/disconnect', authenticateJWT, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id as string;
    await googleCalendarService.disconnect(userId);
    res.json({ success: true });
}));

export default router;
