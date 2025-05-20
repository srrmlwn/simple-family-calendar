import { AppDataSource } from '../data-source';
import { Event } from '../entities/Event';
import { notificationPreferencesRepository } from '../repositories/NotificationPreferencesRepository';
import { digestLogRepository } from '../repositories/DigestLogRepository';
import { EmailService } from './emailService';
import moment from 'moment-timezone';
import { Between } from 'typeorm';

export class DigestService {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    /**
     * Generate digest content for a user's upcoming events
     */
    private async generateDigestContent(userId: string, timezone: string): Promise<{
        events: Event[];
        htmlContent: string;
        textContent: string;
    }> {
        const eventRepository = AppDataSource.getRepository(Event);
        const now = moment().tz(timezone);
        const tomorrow = now.clone().add(1, 'day').startOf('day');
        const dayAfterTomorrow = tomorrow.clone().add(1, 'day').startOf('day');

        // Get events for the next 24 hours
        const events = await eventRepository.find({
            where: {
                userId,
                startTime: Between(tomorrow.toDate(), dayAfterTomorrow.toDate())
            },
            order: {
                startTime: 'ASC'
            }
        });

        // Generate HTML content
        const htmlContent = this.generateHtmlDigest(events, tomorrow, timezone);
        const textContent = this.generateTextDigest(events, tomorrow, timezone);

        return { events, htmlContent, textContent };
    }

    /**
     * Generate HTML content for the digest email
     */
    private generateHtmlDigest(events: Event[], date: moment.Moment, timezone: string): string {
        const formattedDate = date.format('MMMM D, YYYY');
        let html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Your Daily Calendar Digest - ${formattedDate}</h2>
                <p>Here are your events for tomorrow:</p>
        `;

        if (events.length === 0) {
            html += '<p>No events scheduled for tomorrow.</p>';
        } else {
            html += '<ul style="list-style: none; padding: 0;">';
            events.forEach(event => {
                const startTime = moment(event.startTime).tz(timezone).format('h:mm A');
                const endTime = moment(event.endTime).tz(timezone).format('h:mm A');
                html += `
                    <li style="margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 5px;">
                        <h3 style="margin: 0 0 10px 0; color: #2c5282;">${event.title}</h3>
                        <p style="margin: 5px 0; color: #4a5568;">
                            <strong>Time:</strong> ${startTime} - ${endTime}
                        </p>
                        ${event.location ? `
                            <p style="margin: 5px 0; color: #4a5568;">
                                <strong>Location:</strong> ${event.location}
                            </p>
                        ` : ''}
                        ${event.description ? `
                            <p style="margin: 5px 0; color: #4a5568;">
                                <strong>Description:</strong> ${event.description}
                            </p>
                        ` : ''}
                        <a href="${process.env.CLIENT_URL}/calendar?date=${date.format('YYYY-MM-DD')}" 
                           style="display: inline-block; padding: 8px 16px; background-color: #4299e1; 
                                  color: white; text-decoration: none; border-radius: 4px;">
                            View in Calendar
                        </a>
                    </li>
                `;
            });
            html += '</ul>';
        }

        html += `
                <p style="margin-top: 20px; color: #718096; font-size: 0.9em;">
                    To manage your digest preferences, please visit your calendar settings.
                </p>
                <p style="color: #718096; font-size: 0.9em;">
                    Best regards,<br>
                    famcal.ai
                </p>
            </div>
        `;

        return html;
    }

    /**
     * Generate plain text content for the digest email
     */
    private generateTextDigest(events: Event[], date: moment.Moment, timezone: string): string {
        const formattedDate = date.format('MMMM D, YYYY');
        let text = `Your Daily Calendar Digest - ${formattedDate}\n\n`;
        text += 'Here are your events for tomorrow:\n\n';

        if (events.length === 0) {
            text += 'No events scheduled for tomorrow.\n';
        } else {
            events.forEach(event => {
                const startTime = moment(event.startTime).tz(timezone).format('h:mm A');
                const endTime = moment(event.endTime).tz(timezone).format('h:mm A');
                text += `${event.title}\n`;
                text += `Time: ${startTime} - ${endTime}\n`;
                if (event.location) text += `Location: ${event.location}\n`;
                if (event.description) text += `Description: ${event.description}\n`;
                text += `View in Calendar: ${process.env.CLIENT_URL}/calendar?date=${date.format('YYYY-MM-DD')}\n\n`;
            });
        }

        text += '\nTo manage your digest preferences, please visit your calendar settings.\n\n';
        text += 'Best regards,\nfamcal.ai';

        return text;
    }

    /**
     * Send digest to a user
     */
    public async sendDigest(userId: string, userEmail: string, userName: string, timezone: string): Promise<void> {
        try {
            // Generate digest content
            const { events, htmlContent, textContent } = await this.generateDigestContent(userId, timezone);

            // Send email using the email service
            await this.emailService.sendEmail({
                to: {
                    name: userName,
                    address: userEmail
                },
                subject: `Your Daily Calendar Digest - ${moment().tz(timezone).add(1, 'day').format('MMMM D, YYYY')}`,
                html: htmlContent,
                text: textContent
            });

            // Log successful send
            await digestLogRepository.createLog(userId, 'sent');

            // Update last digest sent time
            const prefs = await notificationPreferencesRepository.findByUserId(userId);
            if (prefs) {
                await notificationPreferencesRepository.updateLastDigestSent(prefs.id, new Date());
            }
        } catch (error) {
            // Log failed send
            await digestLogRepository.createLog(userId, 'failed', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    /**
     * Process all users who should receive a digest now
     */
    public async processDigests(): Promise<void> {
        const currentTime = moment().format('HH:mm');
        const users = await notificationPreferencesRepository.findUsersForDigest(currentTime);

        for (const userPrefs of users) {
            try {
                const user = userPrefs.user;
                await this.sendDigest(
                    user.id,
                    user.email,
                    `${user.firstName} ${user.lastName}`,
                    user.settings?.[0]?.timezone || 'America/New_York'
                );
            } catch (error) {
                console.error(`Failed to send digest to user ${userPrefs.userId}:`, error);
                // Continue with next user even if one fails
            }
        }
    }
}

// Export a singleton instance
export const digestService = new DigestService(); 