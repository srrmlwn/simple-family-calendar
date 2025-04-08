// src/entities/EmailRecipient.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    OneToMany
} from 'typeorm';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { User } from './User';
import { EventRecipient } from './EventRecipient';

@Entity('email_recipients')
export class EmailRecipient {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    @IsNotEmpty({ message: 'Name is required' })
    name!: string;

    @Column()
    @IsEmail({}, { message: 'Invalid email address' })
    @IsNotEmpty({ message: 'Email is required' })
    email!: string;

    @Column({ default: false })
    isDefault!: boolean;

    @Column()
    userId!: string;

    @ManyToOne(() => User, user => user.emailRecipients)
    @JoinColumn({ name: 'userId' })
    user!: User;

    @OneToMany(() => EventRecipient, eventRecipient => eventRecipient.recipient)
    eventRecipients?: EventRecipient[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}