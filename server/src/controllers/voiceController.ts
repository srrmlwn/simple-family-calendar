// src/controllers/voiceController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { toFile } from 'openai';
import { effectiveUserId } from '../utils/effectiveUserId';
import { logLLMCall } from '../services/llmLogger';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB (Whisper API limit)

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are accepted'));
        }
    },
}).single('audio');

// Instantiate lazily so startup doesn't crash when OPENAI_API_KEY isn't set yet
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
}

export const transcribeAudio = async (req: Request, res: Response): Promise<Response> => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }

    const file = await toFile(req.file.buffer, req.file.originalname || 'audio.webm', {
        type: req.file.mimetype,
    });

    const t0 = Date.now();
    const transcription = await getOpenAI().audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
    });
    logLLMCall({
        userId: effectiveUserId(req),
        channel: 'voice',
        model: 'whisper-1',
        latencyMs: Date.now() - t0,
    });

    return res.json({ transcript: transcription.text });
};
