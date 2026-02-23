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

    @ManyToOne(() => User, user => user.settings)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}