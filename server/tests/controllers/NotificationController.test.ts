import { Request, Response } from 'express';
import { notificationController } from '../../src/controllers/notificationController';
import { AppDataSource } from '../../src/data-source';
import { User } from '../../src/entities/User';
import { NotificationPreferences } from '../../src/entities/NotificationPreferences';
import { DigestLog } from '../../src/entities/DigestLog';
import { createTestUser, deleteTestUser } from '../helpers/userHelper';
import moment from 'moment-timezone';

// Extend Express Request type to include user property
interface AuthenticatedRequest extends Request {
    user: {
        id: string;
    };
}

describe('NotificationController', () => {
    let testUser: User;
    let testPreferences: NotificationPreferences;
    let mockRequest: Partial<AuthenticatedRequest>;
    let mockResponse: Partial<Response>;
    let responseObject: any;

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

        // Create some test digest logs
        const logRepo = AppDataSource.getRepository(DigestLog);
        const logs = [
            {
                userId: testUser.id,
                sentAt: moment().subtract(1, 'day').toDate(),
                status: 'sent' as const
            },
            {
                userId: testUser.id,
                sentAt: moment().subtract(2, 'days').toDate(),
                status: 'failed' as const,
                errorMessage: 'Test error'
            }
        ];
        await logRepo.save(logs);
    });

    afterAll(async () => {
        // Clean up test data
        await AppDataSource.getRepository(DigestLog).delete({ userId: testUser.id });
        await AppDataSource.getRepository(NotificationPreferences).delete({ userId: testUser.id });
        await deleteTestUser(testUser.id);
        await AppDataSource.destroy();
    });

    beforeEach(() => {
        // Setup request and response mocks
        mockRequest = {
            user: { id: testUser.id },
            body: {},
            query: {}
        } as Partial<AuthenticatedRequest>;

        responseObject = {};
        mockResponse = {
            json: jest.fn().mockImplementation((result) => {
                responseObject = result;
                return mockResponse;
            }),
            status: jest.fn().mockImplementation((code) => {
                responseObject.statusCode = code;
                return mockResponse;
            })
        };
    });

    describe('getPreferences', () => {
        it('should return user preferences', async () => {
            await notificationController.getPreferences(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(responseObject).toMatchObject({
                userId: testUser.id,
                digestTime: '18:00',
                isDigestEnabled: true
            });
        });

        it('should return default preferences for new user', async () => {
            // Create a new user without preferences
            const newUser = await createTestUser();
            mockRequest.user = { id: newUser.id } as AuthenticatedRequest['user'];

            await notificationController.getPreferences(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(responseObject).toMatchObject({
                digestTime: '18:00',
                isDigestEnabled: true
            });

            // Clean up
            await deleteTestUser(newUser.id);
        });
    });

    describe('updatePreferences', () => {
        it('should update user preferences', async () => {
            mockRequest.body = {
                digestTime: '19:00',
                isDigestEnabled: false
            };

            await notificationController.updatePreferences(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(responseObject).toMatchObject({
                userId: testUser.id,
                digestTime: '19:00',
                isDigestEnabled: false
            });
        });

        it('should validate digest time format', async () => {
            mockRequest.body = {
                digestTime: '25:00',
                isDigestEnabled: true
            };

            await notificationController.updatePreferences(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseObject).toMatchObject({
                error: 'Invalid digest time format. Use HH:mm format.'
            });
        });

        it('should validate isDigestEnabled type', async () => {
            mockRequest.body = {
                digestTime: '18:00',
                isDigestEnabled: 'true'
            };

            await notificationController.updatePreferences(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseObject).toMatchObject({
                error: 'isDigestEnabled must be a boolean'
            });
        });
    });

    describe('getDigestLogs', () => {
        it('should return digest logs with default limit', async () => {
            await notificationController.getDigestLogs(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(Array.isArray(responseObject)).toBe(true);
            expect(responseObject).toHaveLength(2);
            expect(responseObject[0].status).toBe('sent');
            expect(responseObject[1].status).toBe('failed');
        });

        it('should respect custom limit', async () => {
            mockRequest.query = { limit: '1' };

            await notificationController.getDigestLogs(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(responseObject).toHaveLength(1);
        });

        it('should validate limit parameter', async () => {
            mockRequest.query = { limit: 'invalid' };

            await notificationController.getDigestLogs(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseObject).toMatchObject({
                error: 'Invalid limit. Must be between 1 and 50.'
            });
        });
    });

    describe('getDigestStats', () => {
        it('should return digest statistics', async () => {
            const startDate = moment().subtract(7, 'days').format('YYYY-MM-DD');
            const endDate = moment().format('YYYY-MM-DD');
            mockRequest.query = { startDate, endDate };

            await notificationController.getDigestStats(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(responseObject).toMatchObject({
                total: 2,
                successful: 1,
                failed: 1
            });
        });

        it('should require date parameters', async () => {
            await notificationController.getDigestStats(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseObject).toMatchObject({
                error: 'startDate and endDate are required'
            });
        });

        it('should validate date format', async () => {
            mockRequest.query = {
                startDate: 'invalid-date',
                endDate: 'invalid-date'
            };

            await notificationController.getDigestStats(
                mockRequest as Request,
                mockResponse as Response
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(responseObject).toMatchObject({
                error: 'Invalid date format'
            });
        });
    });
}); 