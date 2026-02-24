import { Request, Response } from 'express';
import { AppDataSource } from '../data-source';
import { FamilyMember } from '../entities/FamilyMember';
import { validateOrReject } from 'class-validator';

const ALLOWED_COLORS = new Set([
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
]);

export class FamilyMemberController {
    public getAll = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = req.user?.id;
            const repo = AppDataSource.getRepository(FamilyMember);
            const members = await repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
            return res.json(members);
        } catch (error) {
            console.error('Error fetching family members:', error);
            return res.status(500).json({ error: 'Failed to fetch family members' });
        }
    };

    public create = async (req: Request, res: Response): Promise<Response> => {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });
            const { name, color } = req.body;

            if (!name || !color) {
                return res.status(400).json({ error: 'Name and color are required' });
            }

            if (!ALLOWED_COLORS.has(color)) {
                return res.status(400).json({ error: 'Color must be one of the allowed palette colors' });
            }

            const member = new FamilyMember();
            member.name = name;
            member.color = color;
            member.userId = userId;

            await validateOrReject(member);

            const repo = AppDataSource.getRepository(FamilyMember);
            const saved = await repo.save(member);
            return res.status(201).json(saved);
        } catch (error) {
            console.error('Error creating family member:', error);
            return res.status(500).json({
                error: 'Failed to create family member',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    public update = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const { name, color } = req.body;

            const repo = AppDataSource.getRepository(FamilyMember);
            const member = await repo.findOne({ where: { id, userId } });

            if (!member) {
                return res.status(404).json({ error: 'Family member not found' });
            }

            if (name) member.name = name;
            if (color) {
                if (!ALLOWED_COLORS.has(color)) {
                    return res.status(400).json({ error: 'Color must be one of the allowed palette colors' });
                }
                member.color = color;
            }

            await validateOrReject(member);
            const updated = await repo.save(member);
            return res.json(updated);
        } catch (error) {
            console.error('Error updating family member:', error);
            return res.status(500).json({
                error: 'Failed to update family member',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    };

    public delete = async (req: Request, res: Response): Promise<Response> => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            const repo = AppDataSource.getRepository(FamilyMember);
            const member = await repo.findOne({ where: { id, userId } });

            if (!member) {
                return res.status(404).json({ error: 'Family member not found' });
            }

            await repo.remove(member);
            return res.status(204).send();
        } catch (error) {
            console.error('Error deleting family member:', error);
            return res.status(500).json({ error: 'Failed to delete family member' });
        }
    };
}

export default new FamilyMemberController();
