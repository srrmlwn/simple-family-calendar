// src/entities/UserSettings.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { User } from './User';

@Entity('user_settings')
export class UserSettings {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @Column({ default: 'light' })
    theme!: string;

    @Column({ default: '12h' })
    timeFormat!: string;

    @Column({ default: 'America/New_York' })
    timezone!: string;

    @Column('json', { nullable: true })
    notificationPreferences?: object;

    @Column({ name: 'onboarding_completed', default: false })
    onboardingCompleted!: boolean;

    @Column({ name: 'google_refresh_token', type: 'text', nullable: true })
    googleRefreshToken?: string;

    @Column({ name: 'google_access_token', type: 'text', nullable: true })
    googleAccessToken?: string;

    @Column({ name: 'google_token_expiry', type: 'timestamp', nullable: true })
    googleTokenExpiry?: Date;

    @Column({ name: 'google_last_synced_at', type: 'timestamp', nullable: true })
    googleLastSyncedAt?: Date;

    @ManyToOne(() => User, user => user.settings)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}