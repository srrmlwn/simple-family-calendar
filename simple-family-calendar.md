# Simple Family Calendar Project Documentation

## Project Overview
Simple Family Calendar is a web and mobile application designed to help families manage their schedules using natural language processing. The app allows users to create and edit events using natural language input (e.g., "Soccer Practice at 3pm on Saturday at Ballard Soccer Field") and send email invitations to family members.

## Technical Stack

### Frontend
- **Framework**: React with TypeScript
- **State Management**: React Context API
- **UI Components**: Tailwind CSS
- **Calendar Component**: react-big-calendar
- **Date/Time Handling**: date-fns
- **Mobile**: Capacitor for Android app
- **Form Management**: React Hook Form
- **API Client**: Axios
- **Navigation**: React Router

### Backend
- **Framework**: Node.js with Express
- **Language**: TypeScript
- **Natural Language Processing**: Compromise
- **Email Service**: Nodemailer with iCalendar attachments
- **Authentication**: JWT with HTTP-only cookies
- **Validation**: class-validator
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Migrations**: TypeORM migrations
- **Social Login**: Google OAuth

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Events Table
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    location VARCHAR(255),
    color VARCHAR(50),
    status VARCHAR(50) DEFAULT 'confirmed',
    external_id VARCHAR(255),
    user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Email Recipients Table
```sql
CREATE TABLE email_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Event Recipients Table
```sql
CREATE TABLE event_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);
```

### User Settings Table
```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    time_format VARCHAR(10) DEFAULT '12h',
    timezone VARCHAR(100) DEFAULT 'America/New_York',
    notification_preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Project Structure

### Client (React Application)
```
client/
├── public/                 # Static files
│   ├── landing_page_logo_1024x1024.png  # Main application logo
│   ├── android_app_icon_512x512.png     # Android app icon
│   ├── favicon.svg                      # Vector favicon
│   ├── favicon_32x32.png               # Small favicon
│   ├── favicon_64x64.png               # Medium favicon
│   ├── favicon.ico                     # Legacy favicon
│   ├── index.html                      # HTML template
│   └── robots.txt                      # Search engine rules
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── calendar/      # Calendar-related components
│   │   ├── forms/         # Form components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # Basic UI components
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API services and client
│   ├── store/             # State management
│   ├── styles/            # Global styles and Tailwind
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   └── App.tsx            # Main application component
├── android/               # Capacitor Android configuration
└── capacitor.config.ts    # Capacitor configuration
```

### Server (Node.js Backend)
```
server/
├── src/
│   ├── config/            # Configuration files
│   │   ├── database.ts    # Database configuration
│   │   └── auth.ts        # Authentication settings
│   ├── controllers/       # API controllers
│   │   ├── auth.ts        # Authentication endpoints
│   │   ├── events.ts      # Event management
│   │   └── users.ts       # User management
│   ├── entities/          # TypeORM entities
│   │   ├── Event.ts       # Event model
│   │   ├── User.ts        # User model
│   │   ├── UserSettings.ts # User settings model
│   │   ├── EmailRecipient.ts # Email recipient model
│   │   └── EventRecipient.ts # Event recipient model
│   ├── middleware/        # Express middleware
│   │   ├── auth.ts        # Authentication middleware
│   │   └── error.ts       # Error handling
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   │   ├── auth.ts        # Authentication service
│   │   ├── event.ts       # Event management
│   │   └── email.ts       # Email service
│   ├── utils/             # Utility functions
│   └── app.ts             # Express application setup
├── tests/                 # Backend tests
└── logs/                  # Application logs
```

## Current Implementation Status

### Completed Features
1. **User Authentication**
   - Email/password registration and login
   - JWT-based session management
   - Protected API routes
   - User settings management

2. **Event Management**
   - Create, read, update, and delete events
   - Event duration tracking
   - All-day event support
   - Event status management
   - Event color coding
   - Location support

3. **Calendar Interface**
   - Monthly, weekly, and daily views
   - Event creation and editing
   - Drag-and-drop event management
   - Responsive design

4. **Email Integration**
   - Email recipient management
   - Default recipient lists
   - Email invitation system

### In Progress Features
1. **Natural Language Processing**
   - Basic date/time parsing
   - Location extraction
   - Event creation from text

2. **Mobile Support**
   - Android app setup with Capacitor
   - Basic mobile UI adaptation
   - Offline capabilities (planned)

### Planned Features
1. **Advanced Calendar Features**
   - Recurring events
   - Event categories and tags
   - Calendar sharing
   - External calendar integration

2. **Enhanced User Experience**
   - Voice input support
   - Advanced notification system
   - Family member roles and permissions
   - Event templates

3. **Analytics and Reporting**
   - Usage statistics
   - Family schedule insights
   - Activity reports

## Development Guidelines

1. **Code Organization**
   - Follow TypeScript best practices
   - Use functional components with hooks
   - Implement proper error handling
   - Write unit tests for critical functionality

2. **Database Management**
   - Use TypeORM migrations for schema changes
   - Maintain data integrity with foreign keys
   - Implement proper indexing for performance

3. **Security**
   - Use JWT for authentication
   - Implement proper password hashing
   - Sanitize user inputs
   - Use HTTPS in production

4. **Performance**
   - Optimize database queries
   - Implement proper caching
   - Minimize bundle size
   - Use lazy loading where appropriate

## Future Enhancements

1. **Voice Input**
   - Implement voice-to-text for event creation
   - Support for multiple languages
   - Voice command shortcuts

2. **Calendar Integration**
   - Sync with Google Calendar
   - Import/export events
   - Share calendars with family members

3. **Advanced Features**
   - Recurring events
   - Event categories and tags
   - Family member roles and permissions
   - Event templates
   - Analytics and usage statistics

## Deployment

The application is designed to be deployed on Heroku with:
- Frontend: Static site hosting
- Backend: Node.js dyno
- Database: Heroku PostgreSQL
- Email: SMTP service (configurable)

## Development Setup

1. **Prerequisites**
   - Node.js (v14 or higher)
   - PostgreSQL
   - Android Studio (for mobile development)

2. **Installation**
   ```bash
   # Clone repository
   git clone [repository-url]
   cd simple-family-calendar

   # Install dependencies
   npm install
   cd client && npm install
   cd ../server && npm install

   # Set up environment variables
   cp .env.example .env
   ```

3. **Database Setup**
   ```bash
   # Create database
   createdb simple_family_calendar

   # Run migrations
   cd server
   npm run migration:run
   ```

4. **Running the Application**
   ```bash
   # Start backend
   cd server
   npm run dev

   # Start frontend
   cd client
   npm start
   ```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request
5. Update documentation as needed

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
```typescript
Request: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

Response: {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  token: string;
}
```

#### POST /api/auth/login
```typescript
Request: {
  email: string;
  password: string;
}

Response: {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  token: string;
}
```

#### POST /api/auth/google
```typescript
Request: {
  code: string;
}

Response: {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  token: string;
}
```

### Event Endpoints

#### POST /api/events
```typescript
Request: {
  title: string;
  description?: string;
  startTime: string; // ISO date string
  endTime: string; // ISO date string
  location?: string;
  isAllDay?: boolean;
  recipients?: string[]; // Array of recipient IDs
}

Response: {
  id: string;
  title: string;
  // ... other event fields
}
```

#### GET /api/events
```typescript
Query Parameters: {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  limit?: number;
  offset?: number;
}

Response: {
  events: Event[];
  total: number;
}
```

## Component Documentation

### Core Components

#### CalendarView
```typescript
interface CalendarViewProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  onDateSelect: (date: Date) => void;
  view: 'month' | 'week' | 'day';
  onViewChange: (view: string) => void;
}
```

#### EventForm
```typescript
interface EventFormProps {
  initialData?: Event;
  onSubmit: (data: EventFormData) => void;
  onCancel: () => void;
  recipients: Recipient[];
}
```

#### NaturalLanguageInput
```typescript
interface NaturalLanguageInputProps {
  onParse: (parsedData: ParsedEventData) => void;
  onError: (error: string) => void;
  placeholder?: string;
}
```

## Environment Variables

### Required Variables

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=simple_family_calendar

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=1d

# Email Configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_SENDER_NAME=Simple Family Calendar

# Frontend Configuration
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WS_URL=ws://localhost:4000

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Testing Strategy

### Unit Testing

1. **Frontend Tests**
   - Component rendering tests
   - Hook behavior tests
   - Utility function tests
   - Form validation tests

2. **Backend Tests**
   - Controller tests
   - Service layer tests
   - Database operation tests
   - Authentication tests

### Integration Testing

1. **API Tests**
   - Endpoint functionality
   - Authentication flow
   - Error handling
   - Rate limiting

2. **Database Tests**
   - Migration tests
   - Query performance
   - Data integrity
   - Transaction handling

### Test Coverage Requirements
- Minimum 80% coverage for critical paths
- 100% coverage for authentication
- 100% coverage for data validation
- 90% coverage for business logic

## Error Handling

### Common Error Scenarios

1. **Authentication Errors**
   ```typescript
   {
     code: 'AUTH_ERROR',
     message: string;
     status: 401 | 403;
   }
   ```

2. **Validation Errors**
   ```typescript
   {
     code: 'VALIDATION_ERROR',
     message: string;
     errors: {
       field: string;
       message: string;
     }[];
     status: 400;
   }
   ```

3. **Database Errors**
   ```typescript
   {
     code: 'DB_ERROR',
     message: string;
     status: 500;
   }
   ```

### Error Recovery

1. **Frontend Recovery**
   - Automatic retry for failed API calls
   - Local storage fallback for offline mode
   - Graceful degradation of features

2. **Backend Recovery**
   - Database connection retry
   - Transaction rollback
   - Error logging and monitoring

### Logging Strategy

1. **Frontend Logging**
   - Error boundary logging
   - API call logging
   - User action logging

2. **Backend Logging**
   - Request/response logging
   - Error stack traces
   - Performance metrics
   - Security events

## Authentication Implementation

### Google OAuth Flow

1. Client-side implementation:
   - Uses Google's OAuth 2.0 client library
   - Handles token acquisition and user consent
   - Sends access token to server for verification

2. Server-side implementation:
   - Verifies Google access token
   - Fetches user information from Google's API
   - Creates/updates user in database
   - Returns JWT token for session management

3. Required environment variables:
   ```
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. API Endpoints:
   - POST `/auth/google` - Handles Google OAuth login
   - Returns user information and JWT token

### Standard Authentication

1. Email/Password Login:
   - POST `/auth/login` - Handles email/password login
   - Returns user information and JWT token

2. Registration:
   - POST `/auth/register` - Handles new user registration
   - Returns user information and JWT token

3. User Information:
   - GET `/auth/me` - Returns current user information
   - Protected by JWT authentication

## Branding Assets

### Logo and Icons
The application uses a consistent set of branding assets across different platforms:

1. **Main Logo**
   - File: `landing_page_logo_1024x1024.png`
   - Size: 1024x1024 pixels
   - Usage: Landing page, marketing materials
   - Format: PNG with transparency

2. **Android App Icon**
   - File: `android_app_icon_512x512.png`
   - Size: 512x512 pixels
   - Usage: Android app store and device home screen
   - Format: PNG with transparency

3. **Favicon Set**
   - Vector: `favicon.svg` (primary source)
   - PNG sizes: 32x32, 64x64 pixels
   - Legacy: `favicon.ico`
   - Usage: Browser tabs, bookmarks, and shortcuts
   - Formats: SVG, PNG, ICO

### Brand Guidelines
1. **Logo Usage**
   - Maintain minimum clear space around the logo
   - Use the full-color version on light backgrounds
   - Ensure proper contrast in all applications
   - Do not stretch or distort the logo

2. **Icon Usage**
   - Use appropriate size for each context
   - Maintain aspect ratio
   - Follow platform-specific guidelines for app icons

3. **Color Palette**
   - Primary colors are defined in the Tailwind configuration
   - Use consistent colors across all platforms
   - Ensure accessibility compliance for all color combinations
