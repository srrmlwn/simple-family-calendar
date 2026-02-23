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
import { EventFamilyMember } from './EventFamilyMember';

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

  // Recurring events support
  // rrule: RFC 5545 recurrence rule, e.g. 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20261220T000000Z'
  // Only set on master (template) recurring events.
  @Column({ nullable: true })
  rrule?: string;

  // Dates to skip when expanding this recurring series (stored as ISO date strings).
  @Column({ type: 'jsonb', nullable: true })
  exceptionDates?: string[];

  // Set on single-occurrence overrides; points to the master recurring event.
  @Column({ nullable: true, name: 'recurring_event_id' })
  recurringEventId?: string;

  // The original occurrence start time that this override replaces.
  @Column({ type: 'timestamp', nullable: true, name: 'exception_date' })
  exceptionDate?: Date | string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, user => user.events)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => EventRecipient, eventRecipient => eventRecipient.event)
  eventRecipients?: EventRecipient[];

  @OneToMany(() => EventFamilyMember, efm => efm.event)
  eventFamilyMembers?: EventFamilyMember[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}