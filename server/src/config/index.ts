// src/config/index.ts
import { config } from 'dotenv';

// Load environment variables
config();

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
        // Ensure these are strings
        secret: String(process.env.JWT_SECRET || 'your_jwt_secret_key_change_me_in_production'),
        expiresInDays: process.env.JWT_EXPIRATION_DAYS || "1 day"
    },
    email: {
        host: process.env.EMAIL_HOST || 'smtp.example.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER || 'your_email@example.com',
        password: process.env.EMAIL_PASSWORD || 'your_email_password',
        senderName: process.env.EMAIL_SENDER_NAME || 'Simple Family Calendar'
    }
};