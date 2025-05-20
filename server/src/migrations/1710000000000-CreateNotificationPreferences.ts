import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNotificationPreferences1710000000000 implements MigrationInterface {
    name = 'CreateNotificationPreferences1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "notification_preferences" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "digest_time" time NOT NULL DEFAULT '18:00',
                "is_digest_enabled" boolean NOT NULL DEFAULT true,
                "last_digest_sent" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id"),
                CONSTRAINT "FK_notification_preferences_user" FOREIGN KEY ("user_id") 
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Create index for efficient user lookups
        await queryRunner.query(`
            CREATE INDEX "IDX_notification_preferences_user_id" 
            ON "notification_preferences" ("user_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_notification_preferences_user_id"`);
        await queryRunner.query(`DROP TABLE "notification_preferences"`);
    }
} 