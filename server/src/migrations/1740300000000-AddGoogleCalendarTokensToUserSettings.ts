import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleCalendarTokensToUserSettings1740300000000 implements MigrationInterface {
    name = 'AddGoogleCalendarTokensToUserSettings1740300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_settings"
            ADD COLUMN IF NOT EXISTS "google_refresh_token" text,
            ADD COLUMN IF NOT EXISTS "google_access_token" text,
            ADD COLUMN IF NOT EXISTS "google_token_expiry" timestamp
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_settings"
            DROP COLUMN IF EXISTS "google_refresh_token",
            DROP COLUMN IF EXISTS "google_access_token",
            DROP COLUMN IF EXISTS "google_token_expiry"
        `);
    }
}
