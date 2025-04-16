import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1699123456789 implements MigrationInterface {
    name = 'InitialSchema1699123456789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create users table
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "passwordHash" character varying NOT NULL,
                "firstName" character varying NOT NULL,
                "lastName" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_users_email" UNIQUE ("email"),
                CONSTRAINT "PK_users" PRIMARY KEY ("id")
            )
        `);

        // Create events table
        await queryRunner.query(`
            CREATE TABLE "events" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "title" character varying NOT NULL,
                "description" character varying,
                "startTime" TIMESTAMP NOT NULL,
                "endTime" TIMESTAMP NOT NULL,
                "duration" integer NOT NULL,
                "isAllDay" boolean NOT NULL DEFAULT false,
                "location" character varying,
                "color" character varying,
                "status" character varying NOT NULL DEFAULT 'confirmed',
                "externalId" character varying,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_events" PRIMARY KEY ("id")
            )
        `);

        // Create email_recipients table
        await queryRunner.query(`
            CREATE TABLE "email_recipients" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "isDefault" boolean NOT NULL DEFAULT false,
                "userId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_email_recipients" PRIMARY KEY ("id")
            )
        `);

        // Create event_recipients table
        await queryRunner.query(`
            CREATE TABLE "event_recipients" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "eventId" uuid NOT NULL,
                "recipientId" uuid NOT NULL,
                "notified" boolean NOT NULL DEFAULT false,
                "notifiedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_event_recipients" PRIMARY KEY ("id")
            )
        `);

        // Create user_settings table
        await queryRunner.query(`
            CREATE TABLE "user_settings" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "theme" character varying NOT NULL DEFAULT 'light',
                "timeFormat" character varying NOT NULL DEFAULT '12h',
                "timezone" character varying NOT NULL DEFAULT 'America/New_York',
                "notificationPreferences" json,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_settings" PRIMARY KEY ("id")
            )
        `);

        // Enable uuid-ossp extension for UUID generation
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "events" ADD CONSTRAINT "FK_events_users" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "email_recipients" ADD CONSTRAINT "FK_email_recipients_users" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "event_recipients" ADD CONSTRAINT "FK_event_recipients_events" 
            FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "event_recipients" ADD CONSTRAINT "FK_event_recipients_email_recipients" 
            FOREIGN KEY ("recipientId") REFERENCES "email_recipients"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);

        await queryRunner.query(`
            ALTER TABLE "user_settings" ADD CONSTRAINT "FK_user_settings_users" 
            FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys first
        await queryRunner.query(`ALTER TABLE "user_settings" DROP CONSTRAINT "FK_user_settings_users"`);
        await queryRunner.query(`ALTER TABLE "event_recipients" DROP CONSTRAINT "FK_event_recipients_email_recipients"`);
        await queryRunner.query(`ALTER TABLE "event_recipients" DROP CONSTRAINT "FK_event_recipients_events"`);
        await queryRunner.query(`ALTER TABLE "email_recipients" DROP CONSTRAINT "FK_email_recipients_users"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_events_users"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "user_settings"`);
        await queryRunner.query(`DROP TABLE "event_recipients"`);
        await queryRunner.query(`DROP TABLE "email_recipients"`);
        await queryRunner.query(`DROP TABLE "events"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }
}