import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFamilyMembers1740100000000 implements MigrationInterface {
    name = 'CreateFamilyMembers1740100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "family_members" (
                "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "name"       VARCHAR NOT NULL,
                "color"      VARCHAR(7) NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "event_family_members" (
                "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "event_id"         UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
                "family_member_id" UUID NOT NULL REFERENCES "family_members"("id") ON DELETE CASCADE,
                UNIQUE ("event_id", "family_member_id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "event_family_members"`);
        await queryRunner.query(`DROP TABLE "family_members"`);
    }
}
