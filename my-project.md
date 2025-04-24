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

### Backend
- **Framework**: Node.js with Express
- **Language**: TypeScript
- **Natural Language Processing**: Compromise
- **Email Service**: Nodemailer with iCalendar attachments
- **Authentication**: JWT with HTTP-only cookies
- **Validation**: class-validator

### Database
- **Main Database**: PostgreSQL
- **ORM**: TypeORM
- **Migrations**: TypeORM migrations

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
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
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Email Recipients Table
```sql
CREATE TABLE email_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recipient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Event Recipients Table
```sql
CREATE TABLE event_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_event_recipient_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_recipient_recipient FOREIGN KEY (recipient_id) REFERENCES email_recipients(id) ON DELETE CASCADE,
    CONSTRAINT uq_event_recipient UNIQUE (event_id, recipient_id)
);
```

### User Settings Table
```sql
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    theme VARCHAR(50) DEFAULT 'light',
    time_format VARCHAR(10) DEFAULT '12h',
    timezone VARCHAR(100) DEFAULT 'America/New_York',
    notification_preferences JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Project Structure

### Client (React Application)
```
client/
├── public/                 # Static files
├── src/
│   ├── components/         # UI components
│   ├── context/           # React context for state management
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API services
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
│   ├── controllers/       # API controllers
│   ├── entities/          # TypeORM entities
│   ├── middleware/        # Express middleware
│   ├── migrations/        # Database migrations
│   ├── routes/            # API routes
│   ├── services/          # Business logic services
│   └── app.ts             # Express application setup
└── tests/                 # Backend tests
```

## Key Features

1. **Natural Language Processing**
   - Accepts event creation/editing in natural language
   - Parses dates, times, and locations
   - Future support for voice input

2. **Email Integration**
   - Send calendar invites to family members
   - Manage email recipient lists
   - Customizable email templates

3. **Mobile Support**
   - Android app via Capacitor
   - Responsive web design
   - Offline capabilities

4. **User Settings**
   - Customizable themes
   - Time format preferences
   - Timezone support
   - Notification preferences

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
