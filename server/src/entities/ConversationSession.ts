import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

export interface SessionMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string; // ISO
}

@Entity('conversation_sessions')
export class ConversationSession {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    userId!: string;

    @Column()
    channel!: string; // 'web' | 'whatsapp'

    @Column({ type: 'jsonb', default: [] })
    messages!: SessionMessage[];

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt!: Date;

    @Column({ name: 'expires_at', type: 'timestamptz' })
    expiresAt!: Date;

    // Pending tool call awaiting YES/NO confirmation (WhatsApp only)
    @Column({ name: 'pending_tool_call', type: 'jsonb', nullable: true })
    pendingToolCall?: {
        toolName: string;
        toolInput: Record<string, unknown>;
        confirmationPrompt: string;
    };
}
