import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLLMCalls1740900000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "llm_calls" (
                "id"                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id"             UUID REFERENCES "users"("id") ON DELETE SET NULL,
                "channel"             VARCHAR(20) NOT NULL,
                "model"               VARCHAR(50) NOT NULL,
                "intent"              VARCHAR(20),
                "prompt_tokens"       INTEGER,
                "completion_tokens"   INTEGER,
                "latency_ms"          INTEGER NOT NULL,
                "cost_usd"            NUMERIC(10, 6),
                "confirmed"           BOOLEAN,
                "error"               TEXT,
                "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        await queryRunner.query(`CREATE INDEX ON "llm_calls" ("user_id", "created_at")`);
        await queryRunner.query(`CREATE INDEX ON "llm_calls" ("channel", "created_at")`);
        await queryRunner.query(`CREATE INDEX ON "llm_calls" ("intent", "created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "llm_calls"`);
    }
}
