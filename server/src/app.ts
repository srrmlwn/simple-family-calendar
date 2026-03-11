// src/app.ts
import 'reflect-metadata';
// Sentry must be initialized before any other imports
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: 0.1,
    });
}
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { AppDataSource } from './data-source';
import path from 'path';
import { logRequest } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/security';
import { apiLimiter } from './middleware/rateLimiter';
import config from './config';
import passport from './config/passport';

// Initialize express app
const app = express();
const PORT = config.server.port;

// Middleware
const allowedOrigins = [
    'https://kinroo.ai',
    'https://simple-family-calendar-8282627220c3.herokuapp.com',
    ...(config.server.nodeEnv !== 'production' ? ['http://localhost:3000'] : [])
];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, same-origin)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// All helmet config lives in securityHeaders middleware — do not add app.use(helmet()) here
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(logRequest);
app.use(securityHeaders); // Single source of truth for all security headers

// Health check — used by verify.sh and wait-on to confirm server is ready
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Apply rate limiting to all routes
app.use('/api', apiLimiter);

// Initialize Passport
app.use(passport.initialize());

// Routes
import authRoutes from './routes/auth';
import eventRoutes from './routes/event';
import recipientRoutes from './routes/recipient';
import settingsRoutes from './routes/settings';
import googleCalendarRoutes from './routes/googleCalendar';
import familyMemberRoutes from './routes/familyMember';
import voiceRoutes from './routes/voice';
import flyerRoutes from './routes/flyer';
import familyAccessRoutes from './routes/familyAccess';
import webhookRoutes from './routes/webhook';
import emailIngestRoutes from './routes/emailIngest';
import { authenticateJWT } from './middleware/auth';

// Webhook routes — public, authenticated by Twilio signature (no JWT)
app.use('/api/webhooks', webhookRoutes);
// Email ingest — public, authenticated by webhook secret query param (no JWT)
app.use('/api/email', emailIngestRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/events', authenticateJWT, eventRoutes);
app.use('/api/recipients', authenticateJWT, recipientRoutes);
app.use('/api/settings', authenticateJWT, settingsRoutes);
app.use('/api/family-members', authenticateJWT, familyMemberRoutes);
// Google Calendar routes — /callback is public (Google redirect), others are JWT-protected inline
app.use('/api/google-calendar', googleCalendarRoutes);
// Voice transcription — JWT required
app.use('/api/voice', authenticateJWT, voiceRoutes);
// Flyer image parsing — JWT required
app.use('/api/flyer', authenticateJWT, flyerRoutes);
// Family access — invite/validate is public, others require JWT (handled inside router)
app.use('/api/family', familyAccessRoutes);

// Serve static files in production
if (config.server.nodeEnv === 'staging' || config.server.nodeEnv === 'production') {
    app.use(express.static(path.join(__dirname, '../../client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../client/build/index.html'));
    });
}

// Sentry error handler (must be before other error handlers)
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
AppDataSource.initialize()
    .then(() => {
        console.log('Data Source has been initialized!');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => console.log('Error during Data Source initialization', error));

export default app;