import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleLastSyncedAtToUserSettings1740400000000 implements MigrationInterface {
    name = 'AddGoogleLastSyncedAtToUserSettings1740400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_settings"
            ADD COLUMN IF NOT EXISTS "google_last_synced_at" timestamp
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_settings"
            DROP COLUMN IF EXISTS "google_last_synced_at"
        `);
    }
}
