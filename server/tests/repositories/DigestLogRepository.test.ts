import { AppDataSource } from '../../src/data-source';
import { digestLogRepository } from '../../src/repositories/DigestLogRepository';
import { DigestLog } from '../../src/entities/DigestLog';
import { User } from '../../src/entities/User';
import { createTestUser, deleteTestUser } from '../helpers/userHelper';

describe('DigestLogRepository', () => {
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
        // Clean up any existing logs for the test user
        await AppDataSource.getRepository(DigestLog).delete({ userId: testUser.id });
    });

    describe('createLog', () => {
        it('should create a successful log entry', async () => {
            const log = await digestLogRepository.createLog(testUser.id, 'sent');
            
            expect(log).not.toBeNull();
            expect(log.userId).toBe(testUser.id);
            expect(log.status).toBe('sent');
            expect(log.errorMessage).toBeNull();
            expect(log.sentAt).toBeInstanceOf(Date);
        });

        it('should create a failed log entry with error message', async () => {
            const errorMessage = 'Failed to send email';
            const log = await digestLogRepository.createLog(testUser.id, 'failed', errorMessage);
            
            expect(log).not.toBeNull();
            expect(log.userId).toBe(testUser.id);
            expect(log.status).toBe('failed');
            expect(log.errorMessage).toBe(errorMessage);
            expect(log.sentAt).toBeInstanceOf(Date);
        });
    });

    describe('findByUserId', () => {
        it('should return logs for a user in descending order', async () => {
            // Create multiple logs
            const log1 = await digestLogRepository.createLog(testUser.id, 'sent');
            const log2 = await digestLogRepository.createLog(testUser.id, 'failed', 'Error 1');
            const log3 = await digestLogRepository.createLog(testUser.id, 'sent');

            const logs = await digestLogRepository.findByUserId(testUser.id);
            
            expect(logs).toHaveLength(3);
            expect(logs[0].id).toBe(log3.id); // Most recent first
            expect(logs[1].id).toBe(log2.id);
            expect(logs[2].id).toBe(log1.id);
        });

        it('should respect the limit parameter', async () => {
            // Create multiple logs
            await digestLogRepository.createLog(testUser.id, 'sent');
            await digestLogRepository.createLog(testUser.id, 'sent');
            await digestLogRepository.createLog(testUser.id, 'sent');

            const logs = await digestLogRepository.findByUserId(testUser.id, 2);
            expect(logs).toHaveLength(2);
        });
    });

    describe('getFailedDigests', () => {
        it('should return failed digests within date range', async () => {
            const startDate = new Date();
            startDate.setHours(startDate.getHours() - 1);

            // Create logs
            await digestLogRepository.createLog(testUser.id, 'sent');
            const failedLog = await digestLogRepository.createLog(testUser.id, 'failed', 'Error');
            await digestLogRepository.createLog(testUser.id, 'sent');

            const endDate = new Date();
            endDate.setHours(endDate.getHours() + 1);

            const failedLogs = await digestLogRepository.getFailedDigests(startDate, endDate);
            
            expect(failedLogs).toHaveLength(1);
            expect(failedLogs[0].id).toBe(failedLog.id);
            expect(failedLogs[0].status).toBe('failed');
        });
    });

    describe('getDigestStats', () => {
        it('should return correct statistics', async () => {
            const startDate = new Date();
            startDate.setHours(startDate.getHours() - 1);

            // Create logs
            await digestLogRepository.createLog(testUser.id, 'sent');
            await digestLogRepository.createLog(testUser.id, 'failed', 'Error 1');
            await digestLogRepository.createLog(testUser.id, 'sent');
            await digestLogRepository.createLog(testUser.id, 'failed', 'Error 2');

            const endDate = new Date();
            endDate.setHours(endDate.getHours() + 1);

            const stats = await digestLogRepository.getDigestStats(startDate, endDate);
            
            expect(stats.total).toBe(4);
            expect(stats.successful).toBe(2);
            expect(stats.failed).toBe(2);
        });
    });
}); 