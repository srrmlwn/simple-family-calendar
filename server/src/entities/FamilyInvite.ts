import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { User } from './User';

@Entity('family_invites')
export class FamilyInvite {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    ownerUserId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'owner_user_id' })
    owner!: User;

    @Column({ length: 255 })
    inviteeEmail!: string;

    @Column({ length: 64, unique: true })
    token!: string;

    @Column({ length: 20, default: 'pending' })
    status!: 'pending' | 'accepted' | 'revoked';

    @CreateDateColumn()
    createdAt!: Date;

    @Column({ type: 'timestamptz' })
    expiresAt!: Date;
}
