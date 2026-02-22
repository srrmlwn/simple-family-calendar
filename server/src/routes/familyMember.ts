import { Router } from 'express';
import familyMemberController from '../controllers/familyMemberController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

router.get('/', asyncHandler(familyMemberController.getAll));
router.post('/', asyncHandler(familyMemberController.create));
router.put('/:id', asyncHandler(familyMemberController.update));
router.delete('/:id', asyncHandler(familyMemberController.delete));

export default router;
