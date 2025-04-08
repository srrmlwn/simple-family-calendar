// src/entities/User.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Event } from './Event';
import { EmailRecipient } from './EmailRecipient';
import { UserSettings } from './UserSettings';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @Column()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @OneToMany(() => Event, event => event.user)
  events?: Event[];

  @OneToMany(() => EmailRecipient, recipient => recipient.user)
  emailRecipients?: EmailRecipient[];

  @OneToMany(() => UserSettings, settings => settings.user)
  settings?: UserSettings[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}