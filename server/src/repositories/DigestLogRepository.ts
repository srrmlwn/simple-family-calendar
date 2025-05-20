import { Repository } from 'typeorm';
import { DigestLog } from '../entities/DigestLog';
import { AppDataSource } from '../data-source';
import { Between } from 'typeorm';

export class DigestLogRepository {
    private repository: Repository<DigestLog>;

    constructor() {
        this.repository = AppDataSource.getRepository(DigestLog);
    }

    /**
     * Get digest logs for a user
     */
    async findByUserId(userId: string, limit: number = 10): Promise<DigestLog[]> {
        return this.repository.find({
            where: { userId },
            order: { sentAt: 'DESC' },
            take: limit,
            relations: ['user']
        });
    }

    /**
     * Create a new digest log entry
     */
    async createLog(userId: string, status: 'sent' | 'failed', errorMessage?: string): Promise<DigestLog> {
        const log = new DigestLog();
        log.userId = userId;
        log.sentAt = new Date();
        log.status = status;
        log.errorMessage = errorMessage || null;

        return this.repository.save(log);
    }

    /**
     * Get failed digest logs within a time range
     */
    async getFailedDigests(startDate: Date, endDate: Date): Promise<DigestLog[]> {
        return this.repository.find({
            where: {
                status: 'failed',
                sentAt: Between(startDate, endDate)
            },
            relations: ['user']
        });
    }

    /**
     * Get digest logs for monitoring
     */
    async getDigestStats(startDate: Date, endDate: Date): Promise<{
        total: number;
        successful: number;
        failed: number;
    }> {
        const [total, successful, failed] = await Promise.all([
            this.repository.count({ where: { sentAt: Between(startDate, endDate) } }),
            this.repository.count({ where: { status: 'sent', sentAt: Between(startDate, endDate) } }),
            this.repository.count({ where: { status: 'failed', sentAt: Between(startDate, endDate) } })
        ]);

        return { total, successful, failed };
    }
}

// Export a singleton instance
export const digestLogRepository = new DigestLogRepository(); 