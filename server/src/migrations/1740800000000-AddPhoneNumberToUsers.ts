import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneNumberToUsers1740800000000 implements MigrationInterface {
    name = 'AddPhoneNumberToUsers1740800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "phone_number" varchar UNIQUE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN IF EXISTS "phone_number"
        `);
    }
}
