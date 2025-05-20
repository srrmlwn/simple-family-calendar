import { AppDataSource } from '../../src/data-source';
import { notificationPreferencesRepository } from '../../src/repositories/NotificationPreferencesRepository';
import { NotificationPreferences } from '../../src/entities/NotificationPreferences';
import { User } from '../../src/entities/User';
import { createTestUser, deleteTestUser } from '../helpers/userHelper';

describe('NotificationPreferencesRepository', () => {
    let testUser: User;

    beforeAll(async () => {
        // Initialize database connection
        await AppDataSource.initialize();
        // Create a test user
        testUser = await createTestUser();
    });

    afterAll(async () => {
        // Clean up test user
        await deleteTestUser(testUser.id);
        // Close database connection
        await AppDataSource.destroy();
    });

    beforeEach(async () => {
        // Clean up any existing preferences for the test user
        await AppDataSource.getRepository(NotificationPreferences).delete({ userId: testUser.id });
    });

    describe('findByUserId', () => {
        it('should return null when no preferences exist', async () => {
            const prefs = await notificationPreferencesRepository.findByUserId(testUser.id);
            expect(prefs).toBeNull();
        });

        it('should return preferences when they exist', async () => {
            // Create test preferences
            const prefs = new NotificationPreferences();
            prefs.userId = testUser.id;
            prefs.digestTime = '18:00';
            prefs.isDigestEnabled = true;
            await AppDataSource.getRepository(NotificationPreferences).save(prefs);

            // Find preferences
            const found = await notificationPreferencesRepository.findByUserId(testUser.id);
            expect(found).not.toBeNull();
            expect(found?.userId).toBe(testUser.id);
            expect(found?.digestTime).toBe('18:00');
            expect(found?.isDigestEnabled).toBe(true);
        });
    });

    describe('upsertPreferences', () => {
        it('should create new preferences when none exist', async () => {
            const prefs = await notificationPreferencesRepository.upsertPreferences(testUser.id, {
                digestTime: '19:00',
                isDigestEnabled: true
            });

            expect(prefs).not.toBeNull();
            expect(prefs.userId).toBe(testUser.id);
            expect(prefs.digestTime).toBe('19:00');
            expect(prefs.isDigestEnabled).toBe(true);
        });

        it('should update existing preferences', async () => {
            // Create initial preferences
            const prefs = new NotificationPreferences();
            prefs.userId = testUser.id;
            prefs.digestTime = '18:00';
            prefs.isDigestEnabled = true;
            await AppDataSource.getRepository(NotificationPreferences).save(prefs);

            // Update preferences
            const updated = await notificationPreferencesRepository.upsertPreferences(testUser.id, {
                digestTime: '20:00',
                isDigestEnabled: false
            });

            expect(updated).not.toBeNull();
            expect(updated.userId).toBe(testUser.id);
            expect(updated.digestTime).toBe('20:00');
            expect(updated.isDigestEnabled).toBe(false);
        });
    });

    describe('findUsersForDigest', () => {
        it('should return users with matching digest time and enabled status', async () => {
            // Create test preferences
            const prefs = new NotificationPreferences();
            prefs.userId = testUser.id;
            prefs.digestTime = '18:00';
            prefs.isDigestEnabled = true;
            await AppDataSource.getRepository(NotificationPreferences).save(prefs);

            // Find users for digest
            const users = await notificationPreferencesRepository.findUsersForDigest('18:00');
            expect(users).toHaveLength(1);
            expect(users[0].userId).toBe(testUser.id);
        });

        it('should not return users with different digest time', async () => {
            // Create test preferences
            const prefs = new NotificationPreferences();
            prefs.userId = testUser.id;
            prefs.digestTime = '19:00';
            prefs.isDigestEnabled = true;
            await AppDataSource.getRepository(NotificationPreferences).save(prefs);

            // Find users for digest
            const users = await notificationPreferencesRepository.findUsersForDigest('18:00');
            expect(users).toHaveLength(0);
        });

        it('should not return users with disabled digest', async () => {
            // Create test preferences
            const prefs = new NotificationPreferences();
            prefs.userId = testUser.id;
            prefs.digestTime = '18:00';
            prefs.isDigestEnabled = false;
            await AppDataSource.getRepository(NotificationPreferences).save(prefs);

            // Find users for digest
            const users = await notificationPreferencesRepository.findUsersForDigest('18:00');
            expect(users).toHaveLength(0);
        });
    });
}); 