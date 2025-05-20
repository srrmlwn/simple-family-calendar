import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateDigestLogs1710000000001 implements MigrationInterface {
    name = 'CreateDigestLogs1710000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // First create the enum type
        await queryRunner.query(`
            CREATE TYPE "digest_status" AS ENUM ('sent', 'failed')
        `);

        await queryRunner.query(`
            CREATE TABLE "digest_logs" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "sent_at" TIMESTAMP NOT NULL,
                "status" digest_status NOT NULL DEFAULT 'sent',
                "error_message" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_digest_logs" PRIMARY KEY ("id"),
                CONSTRAINT "FK_digest_logs_user" FOREIGN KEY ("user_id") 
                    REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        // Create indexes for efficient lookups
        await queryRunner.query(`
            CREATE INDEX "IDX_digest_logs_user_id" 
            ON "digest_logs" ("user_id")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_digest_logs_sent_at" 
            ON "digest_logs" ("sent_at")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_digest_logs_sent_at"`);
        await queryRunner.query(`DROP INDEX "IDX_digest_logs_user_id"`);
        await queryRunner.query(`DROP TABLE "digest_logs"`);
        await queryRunner.query(`DROP TYPE "digest_status"`);
    }
} 