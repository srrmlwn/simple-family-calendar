import { Request, Response } from 'express';
import { notificationPreferencesRepository } from '../repositories/NotificationPreferencesRepository';
import { digestLogRepository } from '../repositories/DigestLogRepository';
import { NotificationPreferences } from '../entities/NotificationPreferences';
import { validateOrReject } from 'class-validator';

export class NotificationController {
    /**
     * Get notification preferences for the current user
     */
    public getPreferences = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = (req.user as any)?.id;
            const prefs = await notificationPreferencesRepository.findByUserId(userId);

            if (!prefs) {
                // Return default preferences if none exist
                return res.json({
                    digestTime: '18:00',
                    isDigestEnabled: true
                });
            }

            return res.json(prefs);
        } catch (error) {
            console.error('Error getting notification preferences:', error);
            return res.status(500).json({
                error: 'Failed to get notification preferences',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Update notification preferences for the current user
     */
    public updatePreferences = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = (req.user as any)?.id;
            const { digestTime, isDigestEnabled } = req.body;

            // Validate input
            if (digestTime && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(digestTime)) {
                return res.status(400).json({ error: 'Invalid digest time format. Use HH:mm format.' });
            }

            if (typeof isDigestEnabled !== 'undefined' && typeof isDigestEnabled !== 'boolean') {
                return res.status(400).json({ error: 'isDigestEnabled must be a boolean' });
            }

            // Create or update preferences
            const prefs = await notificationPreferencesRepository.upsertPreferences(userId, {
                digestTime,
                isDigestEnabled
            });

            return res.json(prefs);
        } catch (error) {
            console.error('Error updating notification preferences:', error);
            return res.status(500).json({
                error: 'Failed to update notification preferences',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get digest logs for the current user
     */
    public getDigestLogs = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = (req.user as any)?.id;
            const limit = parseInt(req.query.limit as string) || 10;

            if (isNaN(limit) || limit < 1 || limit > 50) {
                return res.status(400).json({ error: 'Invalid limit. Must be between 1 and 50.' });
            }

            const logs = await digestLogRepository.findByUserId(userId, limit);
            return res.json(logs);
        } catch (error) {
            console.error('Error getting digest logs:', error);
            return res.status(500).json({
                error: 'Failed to get digest logs',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Get digest statistics for the current user
     */
    public getDigestStats = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = (req.user as any)?.id;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({ error: 'startDate and endDate are required' });
            }

            const start = new Date(startDate as string);
            const end = new Date(endDate as string);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ error: 'Invalid date format' });
            }

            const stats = await digestLogRepository.getDigestStats(start, end);
            return res.json(stats);
        } catch (error) {
            console.error('Error getting digest statistics:', error);
            return res.status(500).json({
                error: 'Failed to get digest statistics',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };
}

// Export a singleton instance
export const notificationController = new NotificationController(); 