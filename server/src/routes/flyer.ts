// src/routes/flyer.ts
import { Router, Request, Response, NextFunction } from 'express';
import { uploadImage, parseFlyer, uploadDocument, parseDocument } from '../controllers/flyerController';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// POST /api/flyer/parse-image — legacy: images only
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

// POST /api/flyer/parse-document — images + PDF + DOCX (up to 20 MB)
router.post(
    '/parse-document',
    (req: Request, res: Response, next: NextFunction) => {
        uploadDocument(req, res, (err: unknown) => {
            if (err instanceof Error) {
                res.status(400).json({ error: err.message });
                return;
            }
            next();
        });
    },
    asyncHandler(parseDocument)
);

export default router;
