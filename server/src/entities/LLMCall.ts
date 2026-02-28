import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

@Entity('llm_calls')
export class LLMCall {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', nullable: true })
    userId?: string;

    @Column()
    channel!: string; // 'web' | 'whatsapp' | 'flyer' | 'voice'

    @Column()
    model!: string;

    @Column({ nullable: true })
    intent?: string; // 'create' | 'query' | 'update' | 'delete'

    @Column({ name: 'prompt_tokens', nullable: true })
    promptTokens?: number;

    @Column({ name: 'completion_tokens', nullable: true })
    completionTokens?: number;

    @Column({ name: 'latency_ms' })
    latencyMs!: number;

    @Column({
        name: 'cost_usd',
        type: 'numeric',
        precision: 10,
        scale: 6,
        nullable: true,
    })
    costUsd?: number;

    @Column({ nullable: true })
    confirmed?: boolean;

    @Column({ nullable: true })
    error?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
