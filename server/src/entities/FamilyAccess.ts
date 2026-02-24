import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique
} from 'typeorm';
import { User } from './User';

@Entity('family_access')
@Unique(['ownerUserId', 'coManagerUserId'])
export class FamilyAccess {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    ownerUserId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'owner_user_id' })
    owner!: User;

    @Column()
    coManagerUserId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'co_manager_user_id' })
    coManager!: User;

    @CreateDateColumn()
    createdAt!: Date;
}
