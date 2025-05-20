# Daily Event Digest Feature

## Product Overview

### Goals
- Keep users informed about upcoming events
- Minimize user overhead and configuration
- Provide a simple, reliable notification system
- Ensure users don't miss important events

### User Experience

#### Daily Email Digest
- Users receive a single daily email at 6 PM for the next day's events
- The email includes:
  - Events for the next 24 hours
  - Event details (time, location, description)
  - Link to view event in the calendar
- Users can:
  - Enable/disable the digest in the app settings
  - Change the daily digest time (default: 6 PM)

### User Interface
1. **Settings Page**
   - Simple toggle to enable/disable digest
   - Time picker for daily digest time
   - Uses the user's primary email from their account settings

2. **Email Digest Template**
   ```
   Subject: Your Daily Calendar Digest - [Date]

   Hi [User Name],

   Here are your events for tomorrow ([Date]):

   [Event 1]
   Time: 9:00 AM - 10:00 AM
   Location: Conference Room A
   Description: Team Meeting
   [View in Calendar]

   [Event 2]
   Time: 2:00 PM - 3:00 PM
   Location: Coffee Shop
   Description: Client Meeting
   [View in Calendar]

   [Event 3]
   Time: 6:00 PM - 7:00 PM
   Location: Home
   Description: Family Dinner
   [View in Calendar]

   To manage your digest preferences, please visit your calendar settings.

   Best regards,
   famcal.ai
   ```

## Technical Implementation

### Database Changes

#### New Tables
1. `notification_preferences`
   ```sql
   - user_id (FK)
   - digest_time (time, default: '18:00')
   - is_digest_enabled (boolean, default: true)
   - last_digest_sent (timestamp)
   ```

2. `digest_logs`
   ```sql
   - id
   - user_id (FK)
   - sent_at (timestamp)
   - status (enum: 'sent', 'failed')
   - error_message (string, nullable)
   ```

### Backend Services

1. **Digest Service**
   - Generates daily digest content
   - Handles email sending
   - Tracks digest delivery status
   - Uses app's timezone for scheduling

2. **Scheduler Service**
   - Runs daily job at 6 PM in app's timezone
   - Generates and sends digests
   - Simple queue system

### Integration Points

1. **Email Service**
   - Integration with existing SMTP setup
   - HTML email template
   - Basic email tracking

### Security Considerations

1. **Data Protection**
   - Secure email delivery
   - Rate limiting
   - Spam prevention

2. **Privacy**
   - Data retention policies
   - GDPR compliance

### Performance Considerations

1. **Scalability**
   - Batch processing for digests
   - Efficient database queries
   - Simple queue system

2. **Reliability**
   - Basic error logging
   - Simple monitoring

## Implementation Phases

### Phase 1: Foundation
1. Database schema implementation
2. Basic digest service
3. Email template
4. User preferences UI

### Phase 2: Polish
1. Email template improvements
2. Error handling
3. Basic monitoring
4. Testing

## Open Questions
1. Should we add any additional event details in the email?
2. Should we include events from shared calendars?
3. How to handle all-day events in the digest?

## Next Steps
1. Implement database changes
2. Create email template
3. Set up digest service
4. Add user preferences UI
5. Begin testing 

## Implementation Task List

### 1. Database Setup
- [x] Create migration for `notification_preferences` table
- [x] Create migration for `digest_logs` table
- [x] Add TypeORM entities for both tables
- [x] Add repository classes
- [x] Write database tests

### 2. Backend Service
- [x] Create `DigestService` class
  - [x] Implement digest generation logic
  - [x] Add email sending functionality
  - [x] Add digest logging
  - [x] Write unit tests
- [x] Create `SchedulerService` class
  - [x] Implement daily job at 6 PM
  - [x] Add queue management
  - [x] Write unit tests
- [x] Add API endpoints
  - [x] GET /api/notifications/preferences
  - [x] PUT /api/notifications/preferences
  - [x] GET /api/notifications/digest-logs
  - [x] GET /api/notifications/digest-stats
  - [x] Add API tests

### 3. Frontend Implementation
- [x] Create notification preferences component
  - [x] Add digest time selection
  - [x] Add enable/disable toggle
  - [x] Add digest statistics display
  - [x] Add digest logs display
  - [x] Write component tests
- [x] Integrate into settings page
  - [x] Add notification preferences section
  - [x] Update settings page layout
  - [x] Test integration

### 4. Testing & Documentation
- [x] Write unit tests for all components
- [x] Write integration tests
- [x] Add API documentation
- [x] Add user documentation
- [x] Add developer documentation

### 5. Security & Monitoring
- [x] Add input validation
- [x] Add rate limiting
- [x] Add authentication checks
- [x] Add logging
- [x] Add monitoring
- [x] Add error alerts

### 6. Future Enhancements
- [ ] Allow users to customize digest content
- [ ] Add support for different digest frequencies (weekly, monthly)
- [ ] Implement digest preview
- [ ] Add support for digest delivery via other channels (SMS, push notifications)
- [ ] Allow users to set quiet hours for digest delivery
- [ ] Add support for digest templates
- [ ] Implement digest analytics dashboard
- [ ] Add support for digest categories (work, personal, etc.)
- [ ] Allow users to share digest preferences across family members
- [ ] Add support for digest attachments (e.g., calendar invites)

## Implementation Order
1. Start with database setup (1)
2. Implement backend service (2)
3. Create email template (3)
4. Build frontend UI (4)
5. Integrate components (5)
6. Test and deploy (6)
7. Update documentation (7)

Each task can be implemented independently, but they should be completed in the order listed above to ensure proper dependencies are met. Would you like to start with any particular task? 