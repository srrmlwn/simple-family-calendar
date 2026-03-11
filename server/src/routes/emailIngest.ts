// src/routes/emailIngest.ts
import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { handleEmailIngest } from '../controllers/emailIngestController';

const router = Router();

// Multer — store attachments in memory (max 25 MB per file, 10 files)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

// Rate limit: max 20 inbound emails per IP per hour (prevents abuse)
const emailIngestLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /api/email/inbound — no JWT; authenticated by webhook secret query param
router.post('/inbound', emailIngestLimiter, upload.any(), handleEmailIngest);

export default router;
