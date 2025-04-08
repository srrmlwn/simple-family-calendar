// src/routes/recipient.ts
import { Router } from 'express';
import recipientController from '../controllers/recipientController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Get all recipients
router.get('/', asyncHandler(recipientController.getAllRecipients));

// Get a single recipient by ID
router.get('/:id', asyncHandler(recipientController.getRecipientById));

// Create a new recipient
router.post('/', asyncHandler(recipientController.createRecipient));

// Update an existing recipient
router.put('/:id', asyncHandler(recipientController.updateRecipient));

// Delete a recipient
router.delete('/:id', asyncHandler(recipientController.deleteRecipient));

// Set default recipients
router.post('/defaults', asyncHandler(recipientController.setDefaultRecipients));

export default router;