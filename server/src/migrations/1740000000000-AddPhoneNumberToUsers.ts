import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPhoneNumberToUsers1740000000000 implements MigrationInterface {
    name = 'AddPhoneNumberToUsers1740000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD COLUMN "phone_number" varchar UNIQUE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            DROP COLUMN "phone_number"
        `);
    }
}
