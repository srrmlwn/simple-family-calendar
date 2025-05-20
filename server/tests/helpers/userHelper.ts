import { AppDataSource } from '../../src/data-source';
import { User } from '../../src/entities/User';
import bcrypt from 'bcrypt';

/**
 * Create a test user for testing
 */
export async function createTestUser(): Promise<User> {
    const userRepository = AppDataSource.getRepository(User);
    
    // Create a test user with a unique email
    const testUser = new User();
    testUser.email = `test-${Date.now()}@example.com`;
    testUser.passwordHash = await bcrypt.hash('test-password', 10);
    testUser.firstName = 'Test';
    testUser.lastName = 'User';

    return userRepository.save(testUser);
}

/**
 * Delete a test user and all related data
 */
export async function deleteTestUser(userId: string): Promise<void> {
    const userRepository = AppDataSource.getRepository(User);
    await userRepository.delete(userId);
}

/**
 * Get a test user by ID
 */
export async function getTestUser(userId: string): Promise<User | null> {
    const userRepository = AppDataSource.getRepository(User);
    return userRepository.findOne({ where: { id: userId } });
} 