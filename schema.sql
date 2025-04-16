-- schema.sql
-- Complete database schema for Simple Family Calendar
-- heroku pg:psql DATABASE_URL < schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
                                     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                             );

-- Events table
CREATE TABLE IF NOT EXISTS events (
                                      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
                           duration INTEGER NOT NULL, -- in minutes
                           is_all_day BOOLEAN DEFAULT FALSE,
                           location VARCHAR(255),
    color VARCHAR(50), -- for calendar display
    status VARCHAR(50) DEFAULT 'confirmed',
    external_id VARCHAR(255), -- for external calendar integration
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                           CONSTRAINT fk_event_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Create index on start_time for efficient date range queries
CREATE INDEX idx_event_start_time ON events(start_time);
-- Create index on user_id for efficient user event queries
CREATE INDEX idx_event_user_id ON events(user_id);

-- Email recipients table
CREATE TABLE IF NOT EXISTS email_recipients (
                                                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                             CONSTRAINT fk_recipient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Create index on user_id for efficient recipient lookups
CREATE INDEX idx_recipient_user_id ON email_recipients(user_id);

-- Event recipients table (junction table for events and recipients)
CREATE TABLE IF NOT EXISTS event_recipients (
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

-- Create indexes for efficient event recipient lookups
CREATE INDEX idx_event_recipient_event_id ON event_recipients(event_id);
CREATE INDEX idx_event_recipient_recipient_id ON event_recipients(recipient_id);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
                                             id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    theme VARCHAR(50) DEFAULT 'light',
    time_format VARCHAR(10) DEFAULT '12h',
    timezone VARCHAR(100) DEFAULT 'America/New_York',
    notification_preferences JSONB, -- JSON field for notification settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                             CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

-- Add trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for all tables to update updated_at
CREATE TRIGGER update_user_modtime
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_event_modtime
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_email_recipient_modtime
    BEFORE UPDATE ON email_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_event_recipient_modtime
    BEFORE UPDATE ON event_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_user_settings_modtime
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();