import { digestService } from './DigestService';
import moment from 'moment-timezone';
import cron, { ScheduledTask } from 'node-cron';

export class SchedulerService {
    private digestJob: ScheduledTask | null = null;

    constructor() {
        // Initialize the scheduler
        this.initializeScheduler();
    }

    /**
     * Initialize the scheduler with all jobs
     */
    private initializeScheduler(): void {
        // Schedule digest job to run every minute to check for users who need digests
        // This allows for different digest times per user
        this.digestJob = cron.schedule('* * * * *', async () => {
            try {
                await this.processDigests();
            } catch (error) {
                console.error('Error processing digests:', error);
            }
        });

        // Log when the scheduler starts
        console.log('Scheduler initialized with digest job');
    }

    /**
     * Process digests for all users who should receive them now
     */
    private async processDigests(): Promise<void> {
        try {
            await digestService.processDigests();
        } catch (error) {
            console.error('Error in digest processing job:', error);
            // Don't throw the error - we want the job to continue running
        }
    }

    /**
     * Start the scheduler
     */
    public start(): void {
        if (this.digestJob) {
            this.digestJob.start();
            console.log('Scheduler started');
        }
    }

    /**
     * Stop the scheduler
     */
    public stop(): void {
        if (this.digestJob) {
            this.digestJob.stop();
            console.log('Scheduler stopped');
        }
    }
}

// Export a singleton instance
export const schedulerService = new SchedulerService(); 