# Simple Family Calendar (famcal.ai)

A modern family calendar application that makes planning easy through natural language processing and smart scheduling.

## System Architecture

```mermaid
graph TB
    subgraph Client["Client (React + TypeScript)"]
        UI[UI Components]
        Auth[Auth Context]
        Calendar[Calendar Components]
        Services[API Services]
        State[State Management]
    end

    subgraph Server["Server (Node.js + Express)"]
        API[API Routes]
        Controllers[Controllers]
        Services[Services]
        DB[(PostgreSQL)]
        Email[Email Service]
        Auth[Auth Service]
        Event[Event Service]
    end

    subgraph External["External Services"]
        Google[Google OAuth]
        OpenAI[OpenAI API]
        SMTP[SMTP Server]
    end

    %% Client to Server connections
    UI --> Services
    Auth --> Services
    Calendar --> Services
    Services --> API

    %% Server internal connections
    API --> Controllers
    Controllers --> Services
    Services --> DB
    Event --> Email
    Auth --> Google
    Event --> OpenAI
    Email --> SMTP

    %% Styling
    classDef client fill:#e1f5fe,stroke:#01579b
    classDef server fill:#f3e5f5,stroke:#4a148c
    classDef external fill:#e8f5e9,stroke:#1b5e20
    classDef database fill:#fff3e0,stroke:#e65100

    class Client client
    class Server server
    class External external
    class DB database
```

## Key Components

### Frontend (Client)
- **React + TypeScript**: Modern UI framework with type safety
- **Context API**: State management for authentication and user data
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Capacitor**: Cross-platform mobile app support
- **Google OAuth**: Secure authentication integration

### Backend (Server)
- **Node.js + Express**: RESTful API server
- **TypeORM**: Database ORM with TypeScript support
- **PostgreSQL**: Relational database
- **JWT**: Secure authentication tokens
- **Nodemailer**: Email service integration
- **OpenAI API**: Natural language processing for event parsing

### Core Features
1. **Authentication**
   - Email/Password login
   - Google OAuth integration
   - JWT-based session management

2. **Calendar Management**
   - Event creation and management
   - Natural language event parsing
   - Timezone support
   - Recurring events

3. **Family Sharing**
   - Email-based event sharing
   - Calendar invitations
   - Default recipient management

4. **Mobile Support**
   - Responsive web design
   - Capacitor-based mobile apps
   - Push notifications (planned)

## Project Structure

### Client (React Application)
```
client/
├── public/                 # Static files
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── calendar/      # Calendar-related components
│   │   ├── forms/         # Form components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # Basic UI components
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Page components
│   ├── services/          # API services
│   ├── store/             # State management
│   ├── styles/            # Global styles
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
```

### Server (Node.js Backend)
```
server/
├── src/
│   ├── config/            # Configuration files
│   ├── controllers/       # API controllers
│   ├── entities/          # Database models
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes
│   ├── services/          # Business logic
│   └── utils/             # Utility functions
```

## Development Setup

1. **Prerequisites**
   - Node.js (v16+)
   - PostgreSQL (v13+)
   - npm or yarn

2. **Environment Variables**
   - Create `.env` files in both client and server directories
   - Required variables:
     ```
     # Server
     DATABASE_URL=postgresql://user:password@localhost:5432/famcal
     JWT_SECRET=your-secret-key
     SMTP_HOST=smtp.example.com
     SMTP_USER=your-email
     SMTP_PASS=your-password
     OPENAI_API_KEY=your-openai-key

     # Client
     REACT_APP_API_URL=http://localhost:3001
     REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
     ```

3. **Installation**
   ```bash
   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

4. **Database Setup**
   ```bash
   cd server
   npm run typeorm migration:run
   ```

5. **Running the Application**
   ```bash
   # Start server (development)
   cd server
   npm run dev

   # Start client (development)
   cd client
   npm start
   ```

## Security Features

1. **Authentication**
   - JWT-based authentication
   - Password hashing with bcrypt
   - Google OAuth integration
   - Secure session management

2. **API Security**
   - CORS protection
   - Helmet security headers
   - Rate limiting
   - Input validation

3. **Data Protection**
   - HTTPS enforcement
   - SQL injection prevention
   - XSS protection
   - CSRF protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details 