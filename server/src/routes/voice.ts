// src/routes/voice.ts
import { Router, Request, Response, NextFunction } from 'express';
import { upload, transcribeAudio } from '../controllers/voiceController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// POST /api/voice/transcribe — upload audio, return Whisper transcript
router.post(
    '/transcribe',
    (req: Request, res: Response, next: NextFunction) => {
        upload(req, res, (err) => {
            if (err instanceof Error) {
                res.status(400).json({ error: err.message });
                return;
            }
            next();
        });
    },
    asyncHandler(transcribeAudio)
);

export default router;
