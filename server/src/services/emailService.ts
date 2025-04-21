// src/services/emailService.ts
import nodemailer from 'nodemailer';
import ical, { ICalCalendar, ICalEventStatus, ICalCalendarMethod } from 'ical-generator';
import { Event } from '../entities/Event';
import { EmailRecipient } from '../entities/EmailRecipient';
import config from '../config';

interface EmailSender {
    email: string;
    name: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Create reusable transporter object using Gmail SMTP
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER || '',
                pass: process.env.EMAIL_PASSWORD || '',
            },
        });
    }

    /**
     * Generate iCalendar data for an event
     */
    private generateICalendar(event: Event, sender: EmailSender, method: string = 'REQUEST'): ICalCalendar {
        const calendar = ical({
            name: 'Simple Family Calendar',
            prodId: '//SimpleFamilyCalendar//Calendar//EN',
            method: method as any,
        });

        const eventStatus = method === 'CANCEL'
            ? ICalEventStatus.CANCELLED
            : ICalEventStatus.CONFIRMED;

        calendar.createEvent({
            start: event.startTime,
            end: event.endTime,
            allDay: event.isAllDay,
            summary: event.title,
            description: event.description,
            location: event.location,
            status: eventStatus,
            organizer: {
                name: sender.name,
                email: sender.email,
            },
            created: event.createdAt,
            lastModified: event.updatedAt,
        });

        return calendar;
    }

    /**
     * Send calendar invites to recipients
     */
    public async sendCalendarInvites(event: Event, recipients: EmailRecipient[], sender: EmailSender): Promise<void> {
        const calendar = this.generateICalendar(event, sender, 'REQUEST');
        const calendarData = calendar.toString();

        const emailAddresses = recipients.map(r => ({
            name: r.name,
            address: r.email,
        }));

        console.log('Sending email to:', emailAddresses);
        console.log('Calendar data:', calendarData);
        console.log('Event details:', {
            title: event.title,
            startTime: this.formatDateTime(event.startTime),
            endTime: this.formatDateTime(event.endTime),
            location: event.location,
            description: event.description
        });
        console.log('Sender:', {
            name: sender.name,
            email: sender.email
        });

        await this.transporter.sendMail({
            from: {
                name: sender.name,
                address: sender.email
            },
            to: emailAddresses,
            subject: `Calendar Invitation: ${event.title}`,
            text: `You've been invited to: ${event.title}\n\nWhen: ${this.formatDateTime(event.startTime)} - ${this.formatDateTime(event.endTime)}\n\nWhere: ${event.location || 'Not specified'}\n\nDetails: ${event.description || 'No additional details'}\n\nTo add this event to your calendar, please use the links in the HTML version of this email or open the attached calendar file.`,
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
    public async sendCalendarUpdates(event: Event, recipients: EmailRecipient[], sender: EmailSender): Promise<void> {
        const calendar = this.generateICalendar(event, sender, 'REQUEST');
        const calendarData = calendar.toString();

        const emailAddresses = recipients.map(r => ({
            name: r.name,
            address: r.email,
        }));

        await this.transporter.sendMail({
            from: {
                name: sender.name,
                address: sender.email
            },
            to: emailAddresses,
            subject: `Calendar Update: ${event.title}`,
            text: `An event has been updated: ${event.title}\n\nWhen: ${this.formatDateTime(event.startTime)} - ${this.formatDateTime(event.endTime)}\n\nWhere: ${event.location || 'Not specified'}\n\nDetails: ${event.description || 'No additional details'}\n\nTo update this event in your calendar, please use the links in the HTML version of this email or open the attached calendar file.`,
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
    public async sendCalendarCancellations(event: Event, recipients: EmailRecipient[], sender: EmailSender): Promise<void> {
        const calendar = this.generateICalendar(event, sender, 'CANCEL');
        const calendarData = calendar.toString();

        const emailAddresses = recipients.map(r => ({
            name: r.name,
            address: r.email,
        }));

        await this.transporter.sendMail({
            from: {
                name: sender.name,
                address: sender.email
            },
            to: emailAddresses,
            subject: `Calendar Cancellation: ${event.title}`,
            text: `An event has been cancelled: ${event.title}\n\nWhen: ${this.formatDateTime(event.startTime)} - ${this.formatDateTime(event.endTime)}\n\nTo remove this event from your calendar, please open the attached calendar file.`,
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
     * Generate direct "Add to Calendar" links for popular calendar services
     */
    private generateCalendarLinks(event: Event): string {
        const start = encodeURIComponent(new Date(event.startTime).toISOString());
        const end = encodeURIComponent(new Date(event.endTime).toISOString());
        const title = encodeURIComponent(event.title);
        const location = encodeURIComponent(event.location || '');
        const description = encodeURIComponent(event.description || '');
        
        return `
            <div style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <p style="font-size: 16px; color: #374151; margin: 8px 0;">
                    <strong>Add to your calendar:</strong>
                </p>
                <div style="display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap;">
                    <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${description}&location=${location}" 
                       style="background-color: #4285F4; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                        Google Calendar
                    </a>
                    <a href="https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${start}&enddt=${end}&location=${location}&body=${description}" 
                       style="background-color: #0078D4; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                        Outlook
                    </a>
                    <a href="https://calendar.apple.com/?title=${title}&startdt=${start}&enddt=${end}&location=${location}&description=${description}" 
                       style="background-color: #000000; color: white; padding: 8px 12px; text-decoration: none; border-radius: 4px; font-size: 14px;">
                        Apple Calendar
                    </a>
                </div>
            </div>
        `;
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

        // Generate calendar links
        const calendarLinks = this.generateCalendarLinks(event);

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
          
          ${calendarLinks}
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            This invitation was sent from Simple Family Calendar.
          </p>
        </div>
      </div>
    `;
    }
}

export default new EmailService();