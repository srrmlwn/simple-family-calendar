import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn
} from 'typeorm';
import { Event } from './Event';
import { FamilyMember } from './FamilyMember';

@Entity('event_family_members')
export class EventFamilyMember {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    eventId!: string;

    @Column()
    familyMemberId!: string;

    @ManyToOne(() => Event, event => event.eventFamilyMembers)
    @JoinColumn({ name: 'event_id' })
    event!: Event;

    @ManyToOne(() => FamilyMember, fm => fm.eventFamilyMembers)
    @JoinColumn({ name: 'family_member_id' })
    familyMember!: FamilyMember;
}
