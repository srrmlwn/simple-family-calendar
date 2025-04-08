#!/bin/bash

# Simple Family Calendar Project Setup Script
# This script creates the initial project structure for the Simple Family Calendar application

set -e  # Exit on error

echo "🗓️  Setting up Simple Family Calendar project..."

# Create main project directory
# mkdir -p simple-family-calendar
# cd simple-family-calendar

## Initialize root package.json
#echo "📦 Creating root package.json..."
#cat > package.json << 'EOF'
#{
#  "name": "simple-family-calendar",
#  "version": "1.0.0",
#  "private": true,
#  "scripts": {
#    "start": "cd server && npm start",
#    "server:dev": "cd server && npm run dev",
#    "client:dev": "cd client && npm start",
#    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
#    "build:client": "cd client && npm run build",
#    "build:server": "cd server && npm run build",
#    "build": "npm run build:server && npm run build:client",
#    "install:client": "cd client && npm install",
#    "install:server": "cd server && npm install",
#    "postinstall": "npm run install:server && npm run install:client && npm run build",
#    "test": "cd server && npm test",
#    "heroku-postbuild": "npm run build"
#  },
#  "devDependencies": {
#    "concurrently": "^7.0.0"
#  }
#}
#EOF

# Set up server directory structure
echo "🖥️  Setting up server directory structure..."
mkdir -p server/src/{config,controllers,entities,middleware,migrations,routes,services,utils}
mkdir -p server/tests

# Create server package.json
echo "📦 Creating server package.json..."
cat > server/package.json << 'EOF'
{
  "name": "simple-family-calendar-server",
  "version": "1.0.0",
  "private": true,
  "main": "dist/app.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/app.js",
    "dev": "nodemon --exec ts-node src/app.ts",
    "typeorm": "ts-node -r tsconfig-paths/register ./node_modules/typeorm/cli.js",
    "test": "jest",
    "lint": "eslint . --ext .ts"
  },
  "dependencies": {
    "bcrypt": "^5.0.1",
    "class-validator": "^0.13.2",
    "compromise": "^14.1.0",
    "compromise-dates": "^3.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.17.3",
    "helmet": "^5.0.2",
    "ical-generator": "^3.4.3",
    "jsonwebtoken": "^8.5.1",
    "nodemailer": "^6.7.3",
    "pg": "^8.7.3",
    "reflect-metadata": "^0.1.13",
    "typeorm": "^0.3.6",
    "uuid": "^8.3.2"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.0",
    "@types/cors": "^2.8.12",
    "@types/express": "^4.17.13",
    "@types/jest": "^27.4.1",
    "@types/jsonwebtoken": "^8.5.8",
    "@types/node": "^17.0.23",
    "@types/nodemailer": "^6.4.4",
    "@types/supertest": "^2.0.12",
    "@types/uuid": "^8.3.4",
    "jest": "^27.5.1",
    "nodemon": "^2.0.15",
    "supertest": "^6.2.2",
    "ts-jest": "^27.1.4",
    "ts-node": "^10.7.0",
    "tsconfig-paths": "^3.14.1",
    "typescript": "^4.6.3"
  }
}
EOF

# Create tsconfig.json for server
echo "⚙️  Creating server TypeScript configuration..."
cat > server/tsconfig.json << 'EOF'
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
EOF

# Create environment variables file
echo "🔐 Creating .env file..."
cat > .env << 'EOF'
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
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
EOF

# Create basic server files
echo "📝 Creating basic server files..."

# Create database configuration
cat > server/src/config/database.ts << 'EOF'
import { DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionOptions: DataSourceOptions = {
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
  ]
};

export default connectionOptions;
EOF

# Create main app file
cat > server/src/app.ts << 'EOF'
import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import connectionOptions from './config/database';

// Load environment variables
config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Create database connection
const AppDataSource = new DataSource(connectionOptions);

// Simple test route
app.get('/', (req, res) => {
  res.json({ message: 'Simple Family Calendar API' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

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
EOF

# Create User entity
cat > server/src/entities/User.ts << 'EOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
EOF

# Create Event entity
cat > server/src/entities/Event.ts << 'EOF'
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn
} from 'typeorm';
import { User } from './User';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column()
  duration: number;

  @Column({ default: false })
  isAllDay: boolean;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  color: string;

  @Column({ default: 'confirmed' })
  status: string;

  @Column({ nullable: true })
  externalId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
EOF

# Create NLP parser service
cat > server/src/services/nlpParser.ts << 'EOF'
// Basic placeholder for NLP parser service
// You'll need to install compromise and compromise-dates packages
export class NLPParser {
  /**
   * Parse a natural language string into event data
   */
  public parseEvent(input: string): any {
    // This is just a placeholder - you'll need to implement the actual parsing logic
    console.log(`Parsing: ${input}`);
    
    return {
      title: "Example Event",
      startTime: new Date(),
      endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
      duration: 60,
      isAllDay: false,
    };
  }
}

export default new NLPParser();
EOF

# Set up client directory with React
echo "🖌️  Setting up React client..."
npx create-react-app client --template typescript

# Create tailwind.config.js in client directory
echo "🎨 Setting up Tailwind CSS..."
cat > client/tailwind.config.js << 'EOF'
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Add Tailwind directives to index.css
cat > client/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
EOF

# Create API service for client
mkdir -p client/src/services
cat > client/src/services/api.ts << 'EOF'
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
EOF

# Create client directories
mkdir -p client/src/{components,context,hooks,pages,utils}

# Create simple Auth context 
cat > client/src/context/AuthContext.tsx << 'EOF'
import React, { createContext, useState, useEffect, useContext } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (token: string, user: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    // Check if user is logged in on page load
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
EOF

# Create PrivateRoute component
cat > client/src/components/PrivateRoute.tsx << 'EOF'
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
EOF

# Create basic Calendar page
cat > client/src/pages/Calendar.tsx << 'EOF'
import React, { useState } from 'react';

const Calendar: React.FC = () => {
  const [inputText, setInputText] = useState('');
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputText.trim()) {
      alert(`Processing: "${inputText}"`);
      setInputText('');
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm py-4 px-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800">Simple Family Calendar</h1>
        </div>
      </header>
      
      <div className="px-6 py-4 bg-white shadow-sm">
        <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Add an event... (e.g., 'Soccer practice tomorrow at 3pm')"
            className="w-full py-3 px-4 focus:outline-none"
          />
        </div>
      </div>
      
      <div className="flex-grow p-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-gray-500">Calendar view will be implemented here</p>
        </div>
      </div>
    </div>
  );
};

export default Calendar;
EOF

# Create basic Login page
cat > client/src/pages/Login.tsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // In a real app, you would call your API here
      // For now, we'll just simulate a successful login
      const mockUser = { id: '1', email, firstName: 'Demo', lastName: 'User' };
      const mockToken = 'mock-jwt-token';
      
      login(mockToken, mockUser);
      navigate('/');
    } catch (err) {
      setError('Invalid email or password');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Simple Family Calendar
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
EOF

# Create basic Registration page
cat > client/src/pages/Register.tsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      // In a real app, you would call your API here
      // For now, we'll just navigate to the login page
      navigate('/login');
    } catch (err) {
      setError('Failed to register');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign up for Simple Family Calendar
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="first-name" className="sr-only">First Name</label>
              <input
                id="first-name"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="First Name"
              />
            </div>
            <div>
              <label htmlFor="last-name" className="sr-only">Last Name</label>
              <input
                id="last-name"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Last Name"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
              />
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
EOF

# Update App.tsx
cat > client/src/App.tsx << 'EOF'
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Calendar from './pages/Calendar';
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
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
EOF

# Create Procfile for Heroku
echo "⚙️  Creating Heroku configuration..."
cat > Procfile << 'EOF'
web: cd server && npm start
EOF

# Create a basic README file
echo "📝 Creating README.md..."
cat > README.md << 'EOF'
# Simple Family Calendar

A simple calendar app that makes it easy to manage your family's schedule using natural language.

## Features

- Create events using natural language input
- Send calendar invites to family members
- Update and cancel events
- Responsive design for web and mobile

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/simple-family-calendar.git
cd simple-family-calendar
```

2. Install dependencies
```bash
npm install
```

3. Set up your PostgreSQL database
   - Create a new database named `simple_family_calendar`
   - Update the `.env` file with your database credentials

4. Start the development server
```bash
npm run dev
```

5. Access the application
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000/api

## License

This project is licensed under the MIT License - see the LICENSE file for details.
EOF

# Create .gitignore file
echo "📝 Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist

# Misc
.DS_Store
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Editor directories and files
.idea
.vscode
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
EOF

echo "✅ Project setup complete!"
echo ""
echo "Next steps:"
echo "1. Create PostgreSQL database: simple_family_calendar"
echo "2. Install dependencies: npm install"
echo "3. Start development server: npm run dev"

cd ..
echo ""
echo "Project created at: $(pwd)/simple-family-calendar"
