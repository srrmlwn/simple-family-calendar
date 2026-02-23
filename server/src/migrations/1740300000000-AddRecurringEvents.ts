import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecurringEvents1740300000000 implements MigrationInterface {
    name = 'AddRecurringEvents1740300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // rrule: RFC 5545 recurrence rule string, e.g. 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261220T000000Z'
        // Only set on master recurring events.
        await queryRunner.query(`
            ALTER TABLE "events"
            ADD COLUMN "rrule" TEXT,
            ADD COLUMN "exception_dates" JSONB,
            ADD COLUMN "recurring_event_id" UUID REFERENCES "events"("id") ON DELETE CASCADE,
            ADD COLUMN "exception_date" TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "events"
            DROP COLUMN "exception_date",
            DROP COLUMN "recurring_event_id",
            DROP COLUMN "exception_dates",
            DROP COLUMN "rrule"
        `);
    }
}
