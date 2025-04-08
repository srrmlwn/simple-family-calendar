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

// Update user settings
router.put('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { theme, timeFormat, timezone, notificationPreferences } = req.body;

    const settingsRepository = AppDataSource.getRepository(UserSettings);
    let settings = await settingsRepository.findOne({
        where: { userId }
    });

    if (!settings) {
        // Create settings if none exist
        settings = new UserSettings();
        settings.userId = userId!;
    }

    // Update fields if provided
    if (theme) settings.theme = theme;
    if (timeFormat) settings.timeFormat = timeFormat;
    if (timezone) settings.timezone = timezone;
    if (notificationPreferences) settings.notificationPreferences = notificationPreferences;

    const updatedSettings = await settingsRepository.save(settings);

    return res.json(updatedSettings);
}));

export default router;