// src/controllers/recipientController.ts
import { Request, Response } from 'express';
import { EmailRecipient } from '../entities/EmailRecipient';
import { validateOrReject } from 'class-validator';
import {AppDataSource} from "../data-source";
import {In} from "typeorm";

export class RecipientController {
    /**
     * Get all recipients for the current user
     */
    public getAllRecipients = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = (req.user as any)?.id;

            const recipientRepository = AppDataSource.getRepository(EmailRecipient);
            const recipients = await recipientRepository.find({
                where: { userId }
            });

            return res.json(recipients);
        } catch (error) {
            console.error('Error fetching recipients:', error);
            return res.status(500).json({ error: 'Failed to fetch recipients' });
        }
    };

    /**
     * Get a single recipient by ID
     */
    public getRecipientById = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = (req.user as any)?.id;

            const recipientRepository = AppDataSource.getRepository(EmailRecipient);
            const recipient = await recipientRepository.findOne({
                where: { id, userId }
            });

            if (!recipient) {
                return res.status(404).json({ error: 'Recipient not found' });
            }

            return res.json(recipient);
        } catch (error) {
            console.error('Error fetching recipient:', error);
            return res.status(500).json({ error: 'Failed to fetch recipient' });
        }
    };

    /**
     * Create a new recipient
     */
    public createRecipient = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = (req.user as any)?.id;
            const { name, email, isDefault = false } = req.body;

            if (!name || !email) {
                return res.status(400).json({ error: 'Name and email are required' });
            }

            const recipient = new EmailRecipient();
            recipient.name = name;
            recipient.email = email;
            recipient.isDefault = isDefault;
            recipient.userId = userId!;

            // Validate recipient data
            await validateOrReject(recipient);

            const recipientRepository = AppDataSource.getRepository(EmailRecipient);
            const savedRecipient = await recipientRepository.save(recipient);

            return res.status(201).json(savedRecipient);
        } catch (error) {
            console.error('Error creating recipient:', error);

            if (error instanceof Error && error.message.includes('duplicate key value')) {
                return res.status(409).json({ error: 'A recipient with this email already exists' });
            }

            return res.status(500).json({
                error: 'Failed to create recipient',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Update an existing recipient
     */
    public updateRecipient = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = (req.user as any)?.id;
            const { name, email, isDefault } = req.body;

            const recipientRepository = AppDataSource.getRepository(EmailRecipient);
            const recipient = await recipientRepository.findOne({
                where: { id, userId }
            });

            if (!recipient) {
                return res.status(404).json({ error: 'Recipient not found' });
            }

            // Update fields if provided
            if (name) recipient.name = name;
            if (email) recipient.email = email;
            if (isDefault !== undefined) recipient.isDefault = isDefault;

            // Validate updated data
            await validateOrReject(recipient);

            const updatedRecipient = await recipientRepository.save(recipient);

            return res.json(updatedRecipient);
        } catch (error) {
            console.error('Error updating recipient:', error);

            if (error instanceof Error && error.message.includes('duplicate key value')) {
                return res.status(409).json({ error: 'A recipient with this email already exists' });
            }

            return res.status(500).json({
                error: 'Failed to update recipient',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    /**
     * Delete a recipient
     */
    public deleteRecipient = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = (req.user as any)?.id;

            const recipientRepository = AppDataSource.getRepository(EmailRecipient);
            const recipient = await recipientRepository.findOne({
                where: { id, userId }
            });

            if (!recipient) {
                return res.status(404).json({ error: 'Recipient not found' });
            }

            await recipientRepository.remove(recipient);

            return res.status(204).send();
        } catch (error) {
            console.error('Error deleting recipient:', error);
            return res.status(500).json({ error: 'Failed to delete recipient' });
        }
    };

    /**
     * Set default recipients
     */
    public setDefaultRecipients = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = (req.user as any)?.id;
            const { recipientIds } = req.body;

            if (!Array.isArray(recipientIds)) {
                return res.status(400).json({ error: 'recipientIds must be an array' });
            }

            const recipientRepository = AppDataSource.getRepository(EmailRecipient);

            // First, set all to non-default
            await recipientRepository.update(
                { userId: userId },
                { isDefault: false }
            );

            // Then set the specified recipients to default
            if (recipientIds.length > 0) {
                // Use In operator in TypeORM 0.3.x
                await recipientRepository.update(
                    {
                        id: In(recipientIds),
                        userId: userId
                    },
                    { isDefault: true }
                );
            }

            const updatedRecipients = await recipientRepository.find({
                where: { userId }
            });

            return res.json(updatedRecipients);
        } catch (error) {
            console.error('Error setting default recipients:', error);
            return res.status(500).json({ error: 'Failed to set default recipients' });
        }
    };
}

export default new RecipientController();