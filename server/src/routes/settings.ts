// src/routes/settings.ts
import { Router } from 'express';
import { Request, Response } from 'express';
import {AppDataSource} from "../data-source";
import { UserSettings } from '../entities/UserSettings';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Get user settings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const settingsRepository = AppDataSource.getRepository(UserSettings);
    let settings = await settingsRepository.findOne({
        where: { userId }
    });

    if (!settings) {
        // Create default settings if none exist
        settings = new UserSettings();
        settings.userId = userId;
        settings.theme = 'light';
        settings.timeFormat = '12h';
        settings.timezone = 'America/New_York';
        settings.notificationPreferences = {
            emailNotifications: true,
            reminderTime: 30 // minutes before event
        };

        settings = await settingsRepository.save(settings);
    }

    return res.json(settings);
}));

const VALID_THEMES = ['light', 'dark'];
const VALID_TIME_FORMATS = ['12h', '24h'];
// Intl.supportedValuesOf available in Node 18+; fall back to accepting any string if unavailable
const intlWithSupportedValues = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
const VALID_TIMEZONES: Set<string> | null = typeof intlWithSupportedValues.supportedValuesOf === 'function'
    ? new Set(intlWithSupportedValues.supportedValuesOf('timeZone'))
    : null;

const VALID_NOTIFICATION_PREFS_KEYS = new Set(['emailNotifications', 'reminderTime']);

// Update user settings
router.put('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { theme, timeFormat, timezone, notificationPreferences } = req.body;

    // Validate each field against an allowlist
    if (theme !== undefined && !VALID_THEMES.includes(theme)) {
        return res.status(400).json({ error: `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}` });
    }
    if (timeFormat !== undefined && !VALID_TIME_FORMATS.includes(timeFormat)) {
        return res.status(400).json({ error: `Invalid timeFormat. Must be one of: ${VALID_TIME_FORMATS.join(', ')}` });
    }
    if (timezone !== undefined && VALID_TIMEZONES !== null && !VALID_TIMEZONES.has(timezone)) {
        return res.status(400).json({ error: 'Invalid timezone identifier' });
    }
    if (notificationPreferences !== undefined) {
        if (typeof notificationPreferences !== 'object' || Array.isArray(notificationPreferences)) {
            return res.status(400).json({ error: 'notificationPreferences must be an object' });
        }
        const unknownKeys = Object.keys(notificationPreferences).filter(k => !VALID_NOTIFICATION_PREFS_KEYS.has(k));
        if (unknownKeys.length > 0) {
            return res.status(400).json({ error: `Unknown notificationPreferences keys: ${unknownKeys.join(', ')}` });
        }
        if (typeof notificationPreferences.emailNotifications !== 'undefined' &&
            typeof notificationPreferences.emailNotifications !== 'boolean') {
            return res.status(400).json({ error: 'emailNotifications must be a boolean' });
        }
        if (typeof notificationPreferences.reminderTime !== 'undefined' &&
            (typeof notificationPreferences.reminderTime !== 'number' || notificationPreferences.reminderTime < 0)) {
            return res.status(400).json({ error: 'reminderTime must be a non-negative number' });
        }
    }

    const settingsRepository = AppDataSource.getRepository(UserSettings);
    let settings = await settingsRepository.findOne({
        where: { userId }
    });

    if (!settings) {
        settings = new UserSettings();
        settings.userId = userId;
    }

    if (theme !== undefined) settings.theme = theme;
    if (timeFormat !== undefined) settings.timeFormat = timeFormat;
    if (timezone !== undefined) settings.timezone = timezone;
    if (notificationPreferences !== undefined) settings.notificationPreferences = notificationPreferences;

    const updatedSettings = await settingsRepository.save(settings);

    return res.json(updatedSettings);
}));

// Mark onboarding as complete
router.post('/complete-onboarding', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const settingsRepository = AppDataSource.getRepository(UserSettings);
    let settings = await settingsRepository.findOne({ where: { userId } });

    if (!settings) {
        settings = new UserSettings();
        settings.userId = userId;
        settings.theme = 'light';
        settings.timeFormat = '12h';
        settings.timezone = 'America/New_York';
    }

    settings.onboardingCompleted = true;
    await settingsRepository.save(settings);

    return res.json({ success: true });
}));

export default router;