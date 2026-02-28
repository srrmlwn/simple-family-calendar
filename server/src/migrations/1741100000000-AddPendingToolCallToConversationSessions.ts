import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingToolCallToConversationSessions1741100000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "conversation_sessions" ADD COLUMN IF NOT EXISTS "pending_tool_call" JSONB`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "conversation_sessions" DROP COLUMN IF EXISTS "pending_tool_call"`
        );
    }
}
