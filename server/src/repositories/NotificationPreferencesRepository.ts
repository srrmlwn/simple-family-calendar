import { Repository } from 'typeorm';
import { NotificationPreferences } from '../entities/NotificationPreferences';
import { AppDataSource } from '../data-source';

export class NotificationPreferencesRepository {
    private repository: Repository<NotificationPreferences>;

    constructor() {
        this.repository = AppDataSource.getRepository(NotificationPreferences);
    }

    /**
     * Get notification preferences for a user
     */
    async findByUserId(userId: string): Promise<NotificationPreferences | null> {
        return this.repository.findOne({
            where: { userId },
            relations: ['user']
        });
    }

    /**
     * Get all users who have digest enabled and it's time to send their digest
     */
    async findUsersForDigest(currentTime: string): Promise<NotificationPreferences[]> {
        return this.repository.find({
            where: {
                isDigestEnabled: true,
                digestTime: currentTime
            },
            relations: ['user']
        });
    }

    /**
     * Update last digest sent time
     */
    async updateLastDigestSent(id: string, lastDigestSent: Date): Promise<void> {
        await this.repository.update(id, { lastDigestSent });
    }

    /**
     * Create or update notification preferences for a user
     */
    async upsertPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
        let existingPrefs = await this.findByUserId(userId);

        if (!existingPrefs) {
            existingPrefs = new NotificationPreferences();
            existingPrefs.userId = userId;
        }

        // Update fields if provided
        if (preferences.digestTime !== undefined) existingPrefs.digestTime = preferences.digestTime;
        if (preferences.isDigestEnabled !== undefined) existingPrefs.isDigestEnabled = preferences.isDigestEnabled;
        if (preferences.lastDigestSent !== undefined) existingPrefs.lastDigestSent = preferences.lastDigestSent;

        return this.repository.save(existingPrefs);
    }
}

// Export a singleton instance
export const notificationPreferencesRepository = new NotificationPreferencesRepository(); 