// src/services/GoogleCalendarService.ts
import { google } from 'googleapis';
import { AppDataSource } from '../data-source';
import { UserSettings } from '../entities/UserSettings';
import { Event } from '../entities/Event';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${process.env.SERVER_URL || 'http://localhost:4000'}/api/google-calendar/callback`;

// Import date range: 30 days past → 12 months future
const IMPORT_PAST_DAYS = 30;
const IMPORT_FUTURE_MONTHS = 12;

function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        REDIRECT_URI
    );
}

export interface ImportResult {
    imported: number;
    skipped: number;
}

export class GoogleCalendarService {

    getAuthUrl(userId: string, loginHint?: string): string {
        const oauth2Client = getOAuth2Client();
        const state = Buffer.from(userId).toString('base64');
        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: SCOPES,
            state,
            ...(loginHint ? { login_hint: loginHint } : {}),
        });
    }

    async handleCallback(code: string, state: string): Promise<string> {
        const userId = Buffer.from(state, 'base64').toString('utf-8');
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        const settingsRepo = AppDataSource.getRepository(UserSettings);
        let settings = await settingsRepo.findOne({ where: { userId } });

        if (!settings) {
            settings = settingsRepo.create({ userId });
        }

        settings.googleRefreshToken = tokens.refresh_token ?? settings.googleRefreshToken;
        settings.googleAccessToken = tokens.access_token ?? undefined;
        settings.googleTokenExpiry = tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : undefined;

        await settingsRepo.save(settings);

        return `${CLIENT_URL}?google_calendar_connected=true`;
    }

    async importEvents(userId: string): Promise<ImportResult> {
        const settingsRepo = AppDataSource.getRepository(UserSettings);
        const settings = await settingsRepo.findOne({ where: { userId } });

        if (!settings?.googleRefreshToken) {
            throw new Error('Google Calendar not connected');
        }

        const oauth2Client = getOAuth2Client();
        oauth2Client.setCredentials({
            refresh_token: settings.googleRefreshToken,
            access_token: settings.googleAccessToken,
            expiry_date: settings.googleTokenExpiry?.getTime(),
        });

        // Persist refreshed tokens if they change
        oauth2Client.on('tokens', async (newTokens) => {
            if (newTokens.access_token) {
                settings.googleAccessToken = newTokens.access_token;
            }
            if (newTokens.refresh_token) {
                settings.googleRefreshToken = newTokens.refresh_token;
            }
            if (newTokens.expiry_date) {
                settings.googleTokenExpiry = new Date(newTokens.expiry_date);
            }
            await settingsRepo.save(settings);
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - IMPORT_PAST_DAYS);
        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + IMPORT_FUTURE_MONTHS);

        let imported = 0;
        let skipped = 0;
        let pageToken: string | undefined;

        const eventRepo = AppDataSource.getRepository(Event);

        do {
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
                maxResults: 250,
                pageToken,
            });

            const items = response.data.items ?? [];
            pageToken = response.data.nextPageToken ?? undefined;

            for (const gEvent of items) {
                if (!gEvent.id || !gEvent.summary) continue;

                const externalId = `google:${gEvent.id}`;

                // Check for existing event by externalId + userId
                const existing = await eventRepo.findOne({
                    where: { externalId, userId },
                });

                if (existing) {
                    skipped++;
                    continue;
                }

                const isAllDay = !gEvent.start?.dateTime && !!gEvent.start?.date;

                let startTime: Date;
                let endTime: Date;

                if (isAllDay) {
                    // All-day events: use noon UTC to avoid timezone shift issues
                    startTime = new Date(`${gEvent.start?.date ?? ''}T12:00:00Z`);
                    endTime = new Date(`${gEvent.end?.date ?? ''}T12:00:00Z`);
                } else {
                    startTime = new Date(gEvent.start?.dateTime ?? '');
                    endTime = new Date(gEvent.end?.dateTime ?? '');
                }

                const duration = Math.round(
                    (endTime.getTime() - startTime.getTime()) / 60000
                );

                const newEvent = eventRepo.create({
                    title: gEvent.summary,
                    description: gEvent.description ?? undefined,
                    location: gEvent.location ?? undefined,
                    startTime,
                    endTime,
                    duration: duration > 0 ? duration : 0,
                    isAllDay,
                    status: gEvent.status === 'cancelled' ? 'cancelled' : 'confirmed',
                    externalId,
                    userId,
                });

                await eventRepo.save(newEvent);
                imported++;
            }
        } while (pageToken);

        return { imported, skipped };
    }

    async isConnected(userId: string): Promise<boolean> {
        const settingsRepo = AppDataSource.getRepository(UserSettings);
        const settings = await settingsRepo.findOne({ where: { userId } });
        return !!settings?.googleRefreshToken;
    }

    async disconnect(userId: string): Promise<void> {
        const settingsRepo = AppDataSource.getRepository(UserSettings);
        const settings = await settingsRepo.findOne({ where: { userId } });
        if (settings) {
            settings.googleRefreshToken = undefined;
            settings.googleAccessToken = undefined;
            settings.googleTokenExpiry = undefined;
            await settingsRepo.save(settings);
        }
    }
}

export const googleCalendarService = new GoogleCalendarService();
