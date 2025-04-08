// src/entities/EventRecipient.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Event } from './Event';
import { EmailRecipient } from './EmailRecipient';

@Entity('event_recipients')
export class EventRecipient {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    eventId!: string;

    @Column()
    recipientId!: string;

    @Column({ default: false })
    notified!: boolean;

    @Column({ nullable: true })
    notifiedAt?: Date;

    @ManyToOne(() => Event, event => event.eventRecipients)
    @JoinColumn({ name: 'eventId' })
    event!: Event;

    @ManyToOne(() => EmailRecipient, recipient => recipient.eventRecipients)
    @JoinColumn({ name: 'recipientId' })
    recipient!: EmailRecipient;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}