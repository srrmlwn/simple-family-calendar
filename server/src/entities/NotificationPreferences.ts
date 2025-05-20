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

@Entity('notification_preferences')
export class NotificationPreferences {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @Column({ type: 'time', default: '18:00' })
    digestTime!: string;

    @Column({ default: true })
    isDigestEnabled!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastDigestSent!: Date | null;

    @ManyToOne(() => User, user => user.notificationPreferences)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
} 