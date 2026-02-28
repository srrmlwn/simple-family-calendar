// src/config/index.ts
import { config } from 'dotenv';
import path from 'path';

// Load environment variables from the correct path
// Only load from .env file if not in production (Heroku)
if (process.env.NODE_ENV !== 'production') {
    config({ path: path.resolve(__dirname, '../../.env') });
}

export default {
    server: {
        port: process.env.PORT || 4000,
        nodeEnv: process.env.NODE_ENV || 'development'
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'simple_family_calendar'
    },
    jwt: {
        secret: (() => {
            const secret = process.env.JWT_SECRET;
            if (!secret && process.env.NODE_ENV === 'production') {
                throw new Error('JWT_SECRET environment variable must be set in production');
            }
            return String(secret || 'dev_jwt_secret_not_for_production');
        })(),
        expiresInDays: process.env.JWT_EXPIRATION_DAYS || "1 day"
    },
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
        senderName: process.env.EMAIL_SENDER_NAME || 'famcal.ai'
    },
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
        webhookUrl: process.env.TWILIO_WEBHOOK_URL || '',
        joinCode: process.env.TWILIO_JOIN_CODE || '',
    }
};