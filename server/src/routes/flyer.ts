// src/routes/flyer.ts
import { Router, Request, Response, NextFunction } from 'express';
import { uploadImage, parseFlyer } from '../controllers/flyerController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// POST /api/flyer/parse-image — upload an image, return extracted calendar events
router.post(
    '/parse-image',
    (req: Request, res: Response, next: NextFunction) => {
        uploadImage(req, res, (err: unknown) => {
            if (err instanceof Error) {
                res.status(400).json({ error: err.message });
                return;
            }
            next();
        });
    },
    asyncHandler(parseFlyer)
);

export default router;
