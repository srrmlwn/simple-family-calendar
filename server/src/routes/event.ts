// src/routes/event.ts
import { Router } from 'express';
import eventController from '../controllers/eventController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Get all events (with optional date range filtering)
router.get('/', asyncHandler(eventController.getAllEvents));

// Get a single event by ID
router.get('/:id', asyncHandler(eventController.getEventById));

// Create event from natural language text
router.post('/text', asyncHandler(eventController.createEventFromText));

// Create a new event
router.post('/', asyncHandler(eventController.createEvent));

// Update an existing event
router.put('/:id', asyncHandler(eventController.updateEvent));

// Delete an event
router.delete('/:id', asyncHandler(eventController.deleteEvent));

export default router;