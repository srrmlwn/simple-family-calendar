import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFamilyAccess1740500000000 implements MigrationInterface {
    name = 'AddFamilyAccess1740500000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "family_invites" (
                "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "owner_user_id"  UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "invitee_email"  VARCHAR(255) NOT NULL,
                "token"          VARCHAR(64) NOT NULL UNIQUE,
                "status"         VARCHAR(20) NOT NULL DEFAULT 'pending',
                "created_at"     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                "expires_at"     TIMESTAMPTZ NOT NULL
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_family_invites_token" ON "family_invites"("token")`);
        await queryRunner.query(`CREATE INDEX "idx_family_invites_owner" ON "family_invites"("owner_user_id")`);

        await queryRunner.query(`
            CREATE TABLE "family_access" (
                "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "owner_user_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "co_manager_user_id"  UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
                "created_at"          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("owner_user_id", "co_manager_user_id")
            )
        `);

        await queryRunner.query(`CREATE INDEX "idx_family_access_co_manager" ON "family_access"("co_manager_user_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "idx_family_access_co_manager"`);
        await queryRunner.query(`DROP TABLE "family_access"`);
        await queryRunner.query(`DROP INDEX "idx_family_invites_owner"`);
        await queryRunner.query(`DROP INDEX "idx_family_invites_token"`);
        await queryRunner.query(`DROP TABLE "family_invites"`);
    }
}
