import { AppDataSource } from '../../src/data-source';
import { schedulerService } from '../../src/services/SchedulerService';
import { digestService } from '../../src/services/DigestService';
import { User } from '../../src/entities/User';
import { NotificationPreferences } from '../../src/entities/NotificationPreferences';
import { createTestUser, deleteTestUser } from '../helpers/userHelper';
import moment from 'moment-timezone';

// Mock the DigestService
jest.mock('../../src/services/DigestService', () => ({
    digestService: {
        processDigests: jest.fn()
    }
}));

describe('SchedulerService', () => {
    let testUser: User;
    let testPreferences: NotificationPreferences;

    beforeAll(async () => {
        // Initialize database connection
        await AppDataSource.initialize();

        // Create a test user
        testUser = await createTestUser();

        // Create test preferences
        const prefsRepo = AppDataSource.getRepository(NotificationPreferences);
        testPreferences = new NotificationPreferences();
        testPreferences.userId = testUser.id;
        testPreferences.digestTime = '18:00';
        testPreferences.isDigestEnabled = true;
        await prefsRepo.save(testPreferences);
    });

    afterAll(async () => {
        // Clean up test data
        await AppDataSource.getRepository(NotificationPreferences).delete({ userId: testUser.id });
        await deleteTestUser(testUser.id);
        await AppDataSource.destroy();
    });

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('start and stop', () => {
        it('should start and stop the scheduler', () => {
            // Start the scheduler
            schedulerService.start();
            expect(digestService.processDigests).not.toHaveBeenCalled();

            // Stop the scheduler
            schedulerService.stop();
        });

        it('should process digests when scheduler is running', async () => {
            // Start the scheduler
            schedulerService.start();

            // Wait for a tick to allow the cron job to run
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify that processDigests was called
            expect(digestService.processDigests).toHaveBeenCalled();

            // Stop the scheduler
            schedulerService.stop();
        });

        it('should not process digests when scheduler is stopped', async () => {
            // Start and immediately stop the scheduler
            schedulerService.start();
            schedulerService.stop();

            // Clear the mock to ensure we're only checking new calls
            jest.clearAllMocks();

            // Wait for a tick
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify that processDigests was not called
            expect(digestService.processDigests).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should handle errors in digest processing', async () => {
            // Mock an error in processDigests
            (digestService.processDigests as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

            // Start the scheduler
            schedulerService.start();

            // Wait for a tick
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify that processDigests was called despite the error
            expect(digestService.processDigests).toHaveBeenCalled();

            // Stop the scheduler
            schedulerService.stop();

            // Restore the mock
            (digestService.processDigests as jest.Mock).mockResolvedValue(undefined);
        });
    });
}); 