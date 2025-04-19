// src/services/emailService.ts
import nodemailer from 'nodemailer';
import ical, { ICalCalendar, ICalEventStatus, ICalCalendarMethod } from 'ical-generator';
import { Event } from '../entities/Event';
import { EmailRecipient } from '../entities/EmailRecipient';
import config from '../config';

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Create reusable transporter object using SMTP transport
        this.transporter = nodemailer.createTransport({
            host: config.email.host,
            port: config.email.port,
            secure: config.email.secure,
            auth: {
                user: config.email.user,
                pass: config.email.password,
            },
        });
    }

    /**
     * Generate iCalendar data for an event
     */
    private generateICalendar(event: Event, method: string = 'REQUEST'): ICalCalendar {
        const calendar = ical({
            name: 'Simple Family Calendar',
            prodId: '//SimpleFamilyCalendar//Calendar//EN',
            method: method as any, // Type assertion to bypass strict checking
        });

        const eventStatus = method === 'CANCEL'
            ? ICalEventStatus.CANCELLED
            : ICalEventStatus.CONFIRMED;

        calendar.createEvent({
            // uid: event.id,
            start: event.startTime,
            end: event.endTime,
            allDay: event.isAllDay,
            summary: event.title,
            description: event.description,
            location: event.location,
            status: eventStatus,
            organizer: {
                name: config.email.senderName,
                email: config.email.user,
            },
            created: event.createdAt,
            lastModified: event.updatedAt,
        });

        return calendar;
    }

    /**
     * Send calendar invites to recipients
     */
    public async sendCalendarInvites(event: Event, recipients: EmailRecipient[]): Promise<void> {
        const calendar = this.generateICalendar(event, 'REQUEST');
        const calendarData = calendar.toString();

        const emailAddresses = recipients.map(r => ({
            name: r.name,
            address: r.email,
        }));

        // Send email with calendar attachment
        await this.transporter.sendMail({
            from: `"${config.email.senderName}" <${config.email.user}>`,
            to: emailAddresses,
            subject: `Calendar Invitation: ${event.title}`,
            text: `You've been invited to: ${event.title}\n\nWhen: ${this.formatDateTime(event.startTime)} - ${this.formatDateTime(event.endTime)}\n\nWhere: ${event.location || 'Not specified'}\n\nDetails: ${event.description || 'No additional details'}`,
            html: this.generateHtmlContent(event, 'invitation'),
            icalEvent: {
                method: 'REQUEST',
                content: calendarData,
            },
        });
    }

    /**
     * Send calendar updates to recipients
     */
    public async sendCalendarUpdates(event: Event, recipients: EmailRecipient[]): Promise<void> {
        const calendar = this.generateICalendar(event, 'REQUEST');
        const calendarData = calendar.toString();

        const emailAddresses = recipients.map(r => ({
            name: r.name,
            address: r.email,
        }));

        // Send email with updated calendar attachment
        await this.transporter.sendMail({
            from: `"${config.email.senderName}" <${config.email.user}>`,
            to: emailAddresses,
            subject: `Calendar Update: ${event.title}`,
            text: `An event has been updated: ${event.title}\n\nWhen: ${this.formatDateTime(event.startTime)} - ${this.formatDateTime(event.endTime)}\n\nWhere: ${event.location || 'Not specified'}\n\nDetails: ${event.description || 'No additional details'}`,
            html: this.generateHtmlContent(event, 'update'),
            icalEvent: {
                method: 'REQUEST',
                content: calendarData,
            },
        });
    }

    /**
     * Send calendar cancellations to recipients
     */
    public async sendCalendarCancellations(event: Event, recipients: EmailRecipient[]): Promise<void> {
        const calendar = this.generateICalendar(event, 'CANCEL');
        const calendarData = calendar.toString();

        const emailAddresses = recipients.map(r => ({
            name: r.name,
            address: r.email,
        }));

        // Send email with cancellation calendar attachment
        await this.transporter.sendMail({
            from: `"${config.email.senderName}" <${config.email.user}>`,
            to: emailAddresses,
            subject: `Calendar Cancellation: ${event.title}`,
            text: `An event has been cancelled: ${event.title}\n\nWhen: ${this.formatDateTime(event.startTime)} - ${this.formatDateTime(event.endTime)}`,
            html: this.generateHtmlContent(event, 'cancellation'),
            icalEvent: {
                method: 'CANCEL',
                content: calendarData,
            },
        });
    }

    /**
     * Format date and time for email display
     */
    private formatDateTime(date: Date | string): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short',
        });
    }

    /**
     * Generate HTML content for emails
     */
    private generateHtmlContent(event: Event, type: 'invitation' | 'update' | 'cancellation'): string {
        const actionText = {
            invitation: 'You have been invited to the following event',
            update: 'The following event has been updated',
            cancellation: 'The following event has been cancelled',
        }[type];

        const bgColor = {
            invitation: '#4f46e5', // Indigo
            update: '#0891b2',    // Cyan
            cancellation: '#dc2626', // Red
        }[type];

        return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${bgColor}; color: white; padding: 20px; text-align: center;">
          <h2 style="margin: 0;">${actionText}</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb;">
          <h1 style="font-size: 24px; color: #111827;">${event.title}</h1>
          
          <div style="margin: 20px 0;">
            <p style="font-size: 16px; color: #374151; margin: 8px 0;">
              <strong>When:</strong> ${this.formatDateTime(event.startTime)} - ${this.formatDateTime(event.endTime)}
            </p>
            ${event.location ? `
              <p style="font-size: 16px; color: #374151; margin: 8px 0;">
                <strong>Where:</strong> ${event.location}
              </p>
            ` : ''}
            ${event.description ? `
              <p style="font-size: 16px; color: #374151; margin: 8px 0;">
                <strong>Details:</strong> ${event.description}
              </p>
            ` : ''}
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            This invitation was sent from Simple Family Calendar.
          </p>
        </div>
      </div>
    `;
    }
}

export default new EmailService();