# Simple Family Calendar Project Setup Guide

This guide will walk you through setting up the Simple Family Calendar application, a family schedule management tool that uses natural language processing to create and manage events.

## Project Structure

```
simple-family-calendar/
├── client/                 # Frontend React application
│   ├── public/
│   └── src/
│       ├── components/     # UI components
│       ├── context/        # React context for state management
│       ├── hooks/          # Custom React hooks
│       ├── pages/          # Page components
│       ├── services/       # API services
│       ├── utils/          # Utility functions
│       └── App.tsx         # Main application component
├── server/                 # Backend Node.js application
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # API controllers
│   │   ├── entities/       # TypeORM entities
│   │   ├── middleware/     # Express middleware
│   │   ├── migrations/     # Database migrations
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   └── app.ts          # Express application setup
│   └── tests/              # Backend tests
└── package.json            # Project dependencies and scripts
```

## Step 1: Set Up the Backend

First, let's set up the Node.js backend with TypeScript, Express, and TypeORM.

### Initialize the Project

```bash
# Create project directory
mkdir simple-family-calendar
cd simple-family-calendar

# Initialize package.json
-- npm init -y

# Add TypeScript and necessary dependencies
npm install express cors helmet dotenv pg typeorm reflect-metadata class-validator uuid
npm install nodemailer ical-generator compromise compromise-dates jsonwebtoken bcrypt
npm install -D typescript @types/node @types/express @types/cors @types/helmet 
npm install -D @types/nodemailer @types/uuid @types/jsonwebtoken @types/bcrypt
npm install -D ts-node nodemon jest ts-jest @types/jest supertest @types/supertest

# -- Initialize TypeScript configuration
npx tsc --init
```

### -- Set Up TypeScript Configuration

Update the `tsconfig.json` file:

```json
{
  "compilerOptions": {
    "target": "es2018",
    "module": "commonjs",
    "lib": ["es2018", "esnext.asynciterable"],
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "moduleResolution": "node",
    "baseUrl": "./src",
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Create Database Configuration

Create `server/src/config/database.ts`:

```typescript
import { ConnectionOptions } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionOptions: ConnectionOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'simple_family_calendar',
  synchronize: !isProduction,
  logging: !isProduction,
  entities: [
    isProduction ? 'dist/entities/**/*.js' : 'src/entities/**/*.ts'
  ],
  migrations: [
    isProduction ? 'dist/migrations/**/*.js' : 'src/migrations/**/*.ts'
  ],
  subscribers: [
    isProduction ? 'dist/subscribers/**/*.js' : 'src/subscribers/**/*.ts'
  ],
  cli: {
    entitiesDir: 'src/entities',
    migrationsDir: 'src/migrations',
    subscribersDir: 'src/subscribers'
  },
  ssl: isProduction ? { rejectUnauthorized: false } : false
};

export default connectionOptions;
```

### Create Environment Variables File

Create `.env` file in the root directory:

```
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=simple_family_calendar

# JWT Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=1d

# Email Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_SENDER_NAME=Simple Family Calendar
```

### Create Entity Classes

Create the database entities as modeled in our schema.

Example for `server/src/entities/User.ts`:

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { Event } from './Event';
import { EmailRecipient } from './EmailRecipient';
import { UserSettings } from './UserSettings';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @Column()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  passwordHash: string;

  @Column()
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @Column()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @OneToMany(() => Event, event => event.user)
  events: Event[];

  @OneToMany(() => EmailRecipient, recipient => recipient.user)
  emailRecipients: EmailRecipient[];

  @OneToMany(() => UserSettings, settings => settings.user)
  settings: UserSettings[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

Create similar entity files for `Event.ts`, `EmailRecipient.ts`, `EventRecipient.ts`, and `UserSettings.ts` based on our database schema.

### Create Main Express Application

Create `server/src/app.ts`:

```typescript
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createConnection } from 'typeorm';
import { config } from 'dotenv';
import connectionOptions from './config/database';
import authRoutes from './routes/auth';
import eventRoutes from './routes/event';
import recipientRoutes from './routes/recipient';
import settingsRoutes from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
import { authenticateJWT } from './middleware/auth';

// Load environment variables
config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', authenticateJWT, eventRoutes);
app.use('/api/recipients', authenticateJWT, recipientRoutes);
app.use('/api/settings', authenticateJWT, settingsRoutes);

// Error handling
app.use(errorHandler);

// Connect to database and start server
createConnection(connectionOptions)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('Error connecting to database:', error);
    process.exit(1);
  });

export default app;
```

## Step 2: Set Up the Frontend

Now, let's set up the React frontend application with TypeScript.

### Create React Application

```bash
# Create React app with TypeScript
npx create-react-app client --template typescript

# Navigate to client directory
cd client

# Install dependencies
npm install axios react-router-dom @types/react-router-dom
npm install react-big-calendar moment @types/react-big-calendar @types/moment
npm install tailwindcss postcss autoprefixer
npm install react-hook-form lucide-react

# Initialize Tailwind CSS
npx tailwindcss init -p
```

### Configure Tailwind CSS

Update `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Add Tailwind directives to `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Set Up API Services

Create `client/src/services/api.ts`:

```typescript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
```

### Create Event Service

Create `client/src/services/eventService.ts`:

```typescript
import api from './api';

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  isAllDay: boolean;
  location?: string;
  status: string;
  color?: string;
}

export interface EventInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  duration?: number;
  isAllDay?: boolean;
  location?: string;
  color?: string;
}

const eventService = {
  // Create event from natural language text
  createFromText: async (text: string): Promise<Event> => {
    const response = await api.post('/events/text', { text });
    return response.data;
  },

  // Get all events
  getAll: async (): Promise<Event[]> => {
    const response = await api.get('/events');
    return response.data.map((event: any) => ({
      ...event,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
    }));
  },

  // Get events by date range
  getByDateRange: async (start: Date, end: Date): Promise<Event[]> => {
    const response = await api.get('/events', {
      params: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
    return response.data.map((event: any) => ({
      ...event,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
    }));
  },

  // Get event by ID
  getById: async (id: string): Promise<Event> => {
    const response = await api.get(`/events/${id}`);
    return {
      ...response.data,
      startTime: new Date(response.data.startTime),
      endTime: new Date(response.data.endTime),
    };
  },

  // Create new event
  create: async (event: EventInput): Promise<Event> => {
    const response = await api.post('/events', event);
    return response.data;
  },

  // Update event
  update: async (id: string, event: Partial<EventInput>): Promise<Event> => {
    const response = await api.put(`/events/${id}`, event);
    return response.data;
  },

  // Delete event
  delete: async (id: string): Promise<void> => {
    await api.delete(`/events/${id}`);
  },
};

export default eventService;
```

### Create App Component

Update `client/src/App.tsx`:

```tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Calendar from './pages/Calendar';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Calendar /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
```

## Step 3: Deployment Configuration

### Set Up Heroku Configuration

Create `Procfile` in the root directory:

```
web: cd server && npm start
```

Create `app.json` in the root directory:

```json
{
  "name": "Simple Family Calendar",
  "description": "A family calendar app with natural language processing",
  "repository": "https://github.com/yourusername/simple-family-calendar",
  "keywords": ["node", "express", "react", "calendar", "nlp"],
  "env": {
    "NODE_ENV": {
      "description": "Environment for the application",
      "value": "production"
    },
    "JWT_SECRET": {
      "description": "Secret key for JWT token generation",
      "generator": "secret"
    }
  },
  "addons": [
    {
      "plan": "heroku-postgresql:hobby-dev"
    }
  ],
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    }
  ]
}
```

### Create Scripts in Root package.json

Update the root `package.json` to include scripts for development and deployment:

```json
{
  "name": "simple-family-calendar",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "cd server && npm start",
    "server:dev": "cd server && npm run dev",
    "client:dev": "cd client && npm start",
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "build:client": "cd client && npm run build",
    "build:server": "cd server && npm run build",
    "build": "npm run build:server && npm run build:client",
    "install:client": "cd client && npm install",
    "install:server": "cd server && npm install",
    "postinstall": "npm run install:server && npm run install:client && npm run build",
    "test": "cd server && npm test",
    "heroku-postbuild": "npm run build"
  },
  "devDependencies": {
    "concurrently": "^7.0.0"
  }
}
```

## Step 4: Getting Started Guide

### Development Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/simple-family-calendar.git
   cd simple-family-calendar
   ```

2. Install dependencies:
   ```bash
   npm install
   npm run install:server
   npm run install:client
   ```

3. Set up your PostgreSQL database:
   - Create a new database named `simple_family_calendar`
   - Update the `.env` file with your database credentials

4. Start the development server:
   ```bash
   npm run dev
   ```
   This will run both the backend server (on port 4000) and the frontend client (on port 3000).

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000/api

### Deploying to Heroku

1. Create a new Heroku app:
   ```bash
   heroku create simple-family-calendar-app
   ```

2. Add PostgreSQL add-on:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

3. Configure environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_secure_jwt_secret
   heroku config:set EMAIL_HOST=your_smtp_server
   heroku config:set EMAIL_PORT=587
   heroku config:set EMAIL_SECURE=false
   heroku config:set EMAIL_USER=your_email@example.com
   heroku config:set EMAIL_PASSWORD=your_email_password
   heroku config:set EMAIL_SENDER_NAME="Simple Family Calendar"
   ```

4. Push code to Heroku:
   ```bash
   git push heroku main
   ```

5. Run database migrations (if needed):
   ```bash
   heroku run npm run typeorm migration:run
   ```

6. Open the deployed app:
   ```bash
   heroku open
   ```

## Alternative Deployment Options

### Vercel + Railway

As an alternative to Heroku, you could use:
- **Vercel** for the React frontend
- **Railway** for the Node.js backend and PostgreSQL database

#### Frontend Deployment on Vercel

1. Create a `vercel.json` file in the client directory:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```

2. Deploy to Vercel:
   ```bash
   cd client
   vercel
   ```

#### Backend Deployment on Railway

1. Create a Railway project and add a PostgreSQL database.

2. Connect your GitHub repository to Railway.

3. Configure the environment variables in Railway dashboard.

4. Set the start command to `cd server && npm start`.

## Mobile App Development

For the mobile app version, you have two options:

### 1. Progressive Web App (PWA)

Convert the React app into a PWA by:

1. Add a web app manifest:
   ```bash
   cd client/public
   touch manifest.json
   ```

2. Edit `manifest.json`:
   ```json
   {
     "short_name": "Family Calendar",
     "name": "Simple Family Calendar",
     "icons": [
       {
         "src": "favicon.ico",
         "sizes": "64x64",
         "type": "image/x-icon"
       },
       {
         "src": "logo192.png",
         "type": "image/png",
         "sizes": "192x192"
       },
       {
         "src": "logo512.png",
         "type": "image/png",
         "sizes": "512x512"
       }
     ],
     "start_url": ".",
     "display": "standalone",
     "theme_color": "#3B82F6",
     "background_color": "#ffffff"
   }
   ```

3. Register a service worker in `index.tsx` to enable offline functionality.

### 2. React Native Mobile App

For a fully native experience, create a React Native app that shares the backend:

1. Generate a new React Native project:
   ```bash
   npx react-native init SimpleFamilyCalendarMobile --template react-native-template-typescript
   ```

2. Share API services and types between web and mobile apps.

3. Implement mobile-specific UI components.

## Conclusion

You now have a complete guide to set up, develop, and deploy the Simple Family Calendar application. The app provides a clean, intuitive interface for managing family events using natural language input and sends calendar invites to keep everyone informed.

Key features implemented:
- Natural language processing for event creation
- Calendar and list views
- Email notifications for event updates
- Responsive design for web and mobile
- User authentication and data security

If you need any further assistance or have questions about specific parts of the implementation, please let me know!