import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailToFamilyMembers1741200000000 implements MigrationInterface {
    name = 'AddEmailToFamilyMembers1741200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "family_members"
            ADD COLUMN IF NOT EXISTS "email" varchar
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "family_members" DROP COLUMN IF EXISTS "email"
        `);
    }
}
