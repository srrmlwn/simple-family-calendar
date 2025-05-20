import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { User } from './User';

@Entity('digest_logs')
export class DigestLog {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @Column({ type: 'timestamp' })
    sentAt!: Date;

    @Column({
        type: 'enum',
        enum: ['sent', 'failed'],
        default: 'sent'
    })
    status!: 'sent' | 'failed';

    @Column({ type: 'text', nullable: true })
    errorMessage!: string | null;

    @ManyToOne(() => User, user => user.digestLogs)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @CreateDateColumn()
    createdAt!: Date;
} 