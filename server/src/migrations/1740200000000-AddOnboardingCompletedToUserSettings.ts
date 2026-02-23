import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOnboardingCompletedToUserSettings1740200000000 implements MigrationInterface {
    name = 'AddOnboardingCompletedToUserSettings1740200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_settings"
            ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean NOT NULL DEFAULT false
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user_settings" DROP COLUMN "onboarding_completed"
        `);
    }
}
