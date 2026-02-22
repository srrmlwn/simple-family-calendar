// src/routes/settings.ts
import { Router } from 'express';
import { Request, Response } from 'express';
import {AppDataSource} from "../data-source";
import { UserSettings } from '../entities/UserSettings';
import { User } from '../entities/User';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Get user settings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;

    const settingsRepository = AppDataSource.getRepository(UserSettings);
    let settings = await settingsRepository.findOne({
        where: { userId }
    });

    if (!settings) {
        // Create default settings if none exist
        settings = new UserSettings();
        settings.userId = userId!;
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
const VALID_TIMEZONES: Set<string> | null = typeof (Intl as any).supportedValuesOf === 'function'
    ? new Set((Intl as any).supportedValuesOf('timeZone'))
    : null;

const VALID_NOTIFICATION_PREFS_KEYS = new Set(['emailNotifications', 'reminderTime']);

// Update user settings
router.put('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
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
        settings.userId = userId!;
    }

    if (theme !== undefined) settings.theme = theme;
    if (timeFormat !== undefined) settings.timeFormat = timeFormat;
    if (timezone !== undefined) settings.timezone = timezone;
    if (notificationPreferences !== undefined) settings.notificationPreferences = notificationPreferences;

    const updatedSettings = await settingsRepository.save(settings);

    return res.json(updatedSettings);
}));

// Link a phone number for WhatsApp / SMS bot access
router.post('/phone', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const { phoneNumber } = req.body as { phoneNumber?: string };

    // Validate E.164 format: +<country code><subscriber number>
    if (!phoneNumber || !/^\+[1-9]\d{6,14}$/.test(phoneNumber)) {
        return res.status(400).json({
            error: 'Phone number must be in E.164 format (e.g. +12125551234)'
        });
    }

    const userRepo = AppDataSource.getRepository(User);

    // Ensure the number isn't already linked to a different account
    const existing = await userRepo.findOne({ where: { phoneNumber } });
    if (existing && existing.id !== userId) {
        return res.status(409).json({
            error: 'This phone number is already linked to another account'
        });
    }

    await userRepo.update(userId, { phoneNumber });
    return res.json({ message: 'Phone number linked successfully', phoneNumber });
}));

// Remove linked phone number
router.delete('/phone', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id;
    const userRepo = AppDataSource.getRepository(User);
    await userRepo.update(userId, { phoneNumber: undefined });
    return res.json({ message: 'Phone number removed' });
}));

export default router;