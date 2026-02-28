import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConversationSessions1741000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "conversation_sessions" (
                "id"          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "channel"     VARCHAR(20) NOT NULL,
                "messages"    JSONB NOT NULL DEFAULT '[]',
                "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "expires_at"  TIMESTAMPTZ NOT NULL
            )
        `);
        await queryRunner.query(
            `CREATE INDEX ON "conversation_sessions" ("user_id", "channel", "expires_at")`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "conversation_sessions"`);
    }
}
