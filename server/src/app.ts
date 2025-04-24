// src/app.ts
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { AppDataSource } from './data-source';
import path from 'path';
import { logRequest } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { securityHeaders } from './middleware/security';

// Load environment variables
config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(logRequest);
app.use(securityHeaders);

// Routes
import authRoutes from './routes/auth';
import eventRoutes from './routes/event';
import recipientRoutes from './routes/recipient';
import settingsRoutes from './routes/settings';
import { authenticateJWT } from './middleware/auth';

app.use('/api/auth', authRoutes);
app.use('/api/events', authenticateJWT, eventRoutes);
app.use('/api/recipients', authenticateJWT, recipientRoutes);
app.use('/api/settings', authenticateJWT, settingsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'staging' || process.env.NODE_ENV === 'production') {
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
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => console.log('Error during Data Source initialization', error));

export default app;