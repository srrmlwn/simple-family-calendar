// src/entities/Event.ts
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
import { User } from './User';
import { EventRecipient } from './EventRecipient';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  startTime!: Date | string;

  @Column({ type: 'timestamp' })
  endTime!: Date | string;

  @Column()
  duration!: number;

  @Column({ default: false })
  isAllDay!: boolean;

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  color?: string;

  @Column({ default: 'confirmed' })
  status!: string;

  @Column({ nullable: true })
  externalId?: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, user => user.events)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => EventRecipient, eventRecipient => eventRecipient.event)
  eventRecipients?: EventRecipient[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}