import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn
} from 'typeorm';
import { IsNotEmpty, Matches } from 'class-validator';
import { User } from './User';
import { EventFamilyMember } from './EventFamilyMember';

@Entity('family_members')
export class FamilyMember {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    userId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column()
    @IsNotEmpty({ message: 'Name is required' })
    name!: string;

    @Column({ length: 7 })
    @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color (e.g. #3B82F6)' })
    color!: string;

    @OneToMany(() => EventFamilyMember, efm => efm.familyMember)
    eventFamilyMembers?: EventFamilyMember[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
