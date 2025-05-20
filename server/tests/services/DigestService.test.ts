import { AppDataSource } from '../../src/data-source';
import { digestService } from '../../src/services/DigestService';
import { Event } from '../../src/entities/Event';
import { User } from '../../src/entities/User';
import { NotificationPreferences } from '../../src/entities/NotificationPreferences';
import { createTestUser, deleteTestUser } from '../helpers/userHelper';
import { EmailService } from '../../src/services/emailService';
import moment from 'moment-timezone';

// Mock the EmailService
jest.mock('../../src/services/emailService', () => {
    return {
        EmailService: jest.fn().mockImplementation(() => ({
            sendEmail: jest.fn().mockResolvedValue(undefined)
        }))
    };
});

describe('DigestService', () => {
    let testUser: User;
    let testEvent: Event;
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

        // Create a test event
        const eventRepo = AppDataSource.getRepository(Event);
        testEvent = new Event();
        testEvent.userId = testUser.id;
        testEvent.title = 'Test Event';
        testEvent.description = 'Test Description';
        testEvent.startTime = moment().add(1, 'day').hour(10).minute(0).toDate();
        testEvent.endTime = moment().add(1, 'day').hour(11).minute(0).toDate();
        testEvent.location = 'Test Location';
        await eventRepo.save(testEvent);
    });

    afterAll(async () => {
        // Clean up test data
        await AppDataSource.getRepository(Event).delete({ userId: testUser.id });
        await AppDataSource.getRepository(NotificationPreferences).delete({ userId: testUser.id });
        await deleteTestUser(testUser.id);
        await AppDataSource.destroy();
    });

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('sendDigest', () => {
        it('should send a digest email with event details', async () => {
            const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
            const mockSendEmail = mockEmailService.prototype.sendEmail as jest.Mock;

            await digestService.sendDigest(
                testUser.id,
                testUser.email,
                `${testUser.firstName} ${testUser.lastName}`,
                'America/New_York'
            );

            // Verify email was sent
            expect(mockSendEmail).toHaveBeenCalledTimes(1);
            const emailCall = mockSendEmail.mock.calls[0][0];

            // Verify email content
            expect(emailCall.to).toEqual({
                name: `${testUser.firstName} ${testUser.lastName}`,
                address: testUser.email
            });
            expect(emailCall.subject).toContain('Your Daily Calendar Digest');
            expect(emailCall.html).toContain(testEvent.title);
            expect(emailCall.html).toContain(testEvent.description);
            expect(emailCall.html).toContain(testEvent.location);
            expect(emailCall.text).toContain(testEvent.title);
            expect(emailCall.text).toContain(testEvent.description);
            expect(emailCall.text).toContain(testEvent.location);
        });

        it('should handle empty event list', async () => {
            // Delete the test event
            await AppDataSource.getRepository(Event).delete({ id: testEvent.id });

            const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
            const mockSendEmail = mockEmailService.prototype.sendEmail as jest.Mock;

            await digestService.sendDigest(
                testUser.id,
                testUser.email,
                `${testUser.firstName} ${testUser.lastName}`,
                'America/New_York'
            );

            // Verify email was sent with no events message
            expect(mockSendEmail).toHaveBeenCalledTimes(1);
            const emailCall = mockSendEmail.mock.calls[0][0];
            expect(emailCall.html).toContain('No events scheduled for tomorrow');
            expect(emailCall.text).toContain('No events scheduled for tomorrow');

            // Restore the test event
            await AppDataSource.getRepository(Event).save(testEvent);
        });

        it('should handle email sending failure', async () => {
            const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
            const mockSendEmail = mockEmailService.prototype.sendEmail as jest.Mock;
            mockSendEmail.mockRejectedValueOnce(new Error('Failed to send email'));

            await expect(digestService.sendDigest(
                testUser.id,
                testUser.email,
                `${testUser.firstName} ${testUser.lastName}`,
                'America/New_York'
            )).rejects.toThrow('Failed to send email');

            // Verify digest log was created with failure status
            const digestLogs = await AppDataSource.getRepository('digest_logs').find({
                where: { userId: testUser.id },
                order: { sentAt: 'DESC' },
                take: 1
            });

            expect(digestLogs).toHaveLength(1);
            expect(digestLogs[0].status).toBe('failed');
            expect(digestLogs[0].errorMessage).toBe('Failed to send email');
        });
    });

    describe('processDigests', () => {
        it('should process digests for users with matching digest time', async () => {
            const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
            const mockSendEmail = mockEmailService.prototype.sendEmail as jest.Mock;

            // Set current time to match digest time
            jest.useFakeTimers();
            const now = moment().hour(18).minute(0).second(0).millisecond(0);
            jest.setSystemTime(now.toDate());

            await digestService.processDigests();

            // Verify email was sent
            expect(mockSendEmail).toHaveBeenCalledTimes(1);

            // Reset timer
            jest.useRealTimers();
        });

        it('should not process digests for users with different digest time', async () => {
            const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
            const mockSendEmail = mockEmailService.prototype.sendEmail as jest.Mock;

            // Set current time to different from digest time
            jest.useFakeTimers();
            const now = moment().hour(19).minute(0).second(0).millisecond(0);
            jest.setSystemTime(now.toDate());

            await digestService.processDigests();

            // Verify no email was sent
            expect(mockSendEmail).not.toHaveBeenCalled();

            // Reset timer
            jest.useRealTimers();
        });

        it('should not process digests for users with disabled digest', async () => {
            // Disable digest for test user
            testPreferences.isDigestEnabled = false;
            await AppDataSource.getRepository(NotificationPreferences).save(testPreferences);

            const mockEmailService = EmailService as jest.MockedClass<typeof EmailService>;
            const mockSendEmail = mockEmailService.prototype.sendEmail as jest.Mock;

            // Set current time to match digest time
            jest.useFakeTimers();
            const now = moment().hour(18).minute(0).second(0).millisecond(0);
            jest.setSystemTime(now.toDate());

            await digestService.processDigests();

            // Verify no email was sent
            expect(mockSendEmail).not.toHaveBeenCalled();

            // Reset timer and restore preferences
            jest.useRealTimers();
            testPreferences.isDigestEnabled = true;
            await AppDataSource.getRepository(NotificationPreferences).save(testPreferences);
        });
    });
}); 