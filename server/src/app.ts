// src/app.ts
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { AppDataSource } from './data-source';
import path from 'path';
import { logRequest } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/security';
import { apiLimiter } from './middleware/rateLimiter';
import config from './config';
import passport from './config/passport';
import { schedulerService } from './services/SchedulerService';

// Initialize express app
const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors());
app.use(helmet()); // Use default helmet configuration except CSP
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logRequest);
app.use(securityHeaders); // This includes our custom CSP configuration

// Apply rate limiting to all routes
app.use('/api', apiLimiter);

// Initialize Passport
app.use(passport.initialize());

// Routes
import authRoutes from './routes/auth';
import eventRoutes from './routes/event';
import recipientRoutes from './routes/recipient';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notificationRoutes';
import { authenticateJWT } from './middleware/auth';

app.use('/api/auth', authRoutes);
app.use('/api/events', authenticateJWT, eventRoutes);
app.use('/api/recipients', authenticateJWT, recipientRoutes);
app.use('/api/settings', authenticateJWT, settingsRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static files in production
if (config.server.nodeEnv === 'staging' || config.server.nodeEnv === 'production') {
    app.use(express.static(path.join(__dirname, '../../client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../../client/build/index.html'));
    });
}

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
AppDataSource.initialize()
    .then(() => {
        console.log('Data Source has been initialized!');
        schedulerService.start(); // Start the scheduler
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => console.log('Error during Data Source initialization', error));

export default app;