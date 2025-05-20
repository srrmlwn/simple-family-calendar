import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NotificationPreferences from '../../components/NotificationPreferences';
import api from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
    get: jest.fn(),
    put: jest.fn()
}));

describe('NotificationPreferences', () => {
    const mockPreferences = {
        digestTime: '18:00',
        isDigestEnabled: true
    };

    const mockLogs = [
        {
            id: '1',
            sentAt: '2024-03-20T18:00:00Z',
            status: 'sent' as const
        },
        {
            id: '2',
            sentAt: '2024-03-19T18:00:00Z',
            status: 'failed' as const,
            errorMessage: 'Test error'
        }
    ];

    const mockStats = {
        total: 2,
        successful: 1,
        failed: 1
    };

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Mock successful API responses
        (api.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/api/notifications/preferences') {
                return Promise.resolve({ data: mockPreferences });
            }
            if (url === '/api/notifications/digest-logs') {
                return Promise.resolve({ data: mockLogs });
            }
            if (url.includes('/api/notifications/digest-stats')) {
                return Promise.resolve({ data: mockStats });
            }
            return Promise.reject(new Error('Not found'));
        });

        (api.put as jest.Mock).mockResolvedValue({ data: mockPreferences });
    });

    it('renders notification preferences form', async () => {
        render(<NotificationPreferences />);

        // Wait for the component to load
        await waitFor(() => {
            expect(screen.getByText('Daily Digest Settings')).toBeInTheDocument();
        });

        // Check if form elements are rendered
        expect(screen.getByLabelText('Digest Time')).toBeInTheDocument();
        expect(screen.getByLabelText('Enable daily digest')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save Preferences' })).toBeInTheDocument();
    });

    it('loads and displays user preferences', async () => {
        render(<NotificationPreferences />);

        // Wait for preferences to load
        await waitFor(() => {
            expect(api.get).toHaveBeenCalledWith('/api/notifications/preferences');
        });

        // Check if preferences are displayed correctly
        const timeInput = screen.getByLabelText('Digest Time') as HTMLInputElement;
        const enableCheckbox = screen.getByLabelText('Enable daily digest') as HTMLInputElement;

        expect(timeInput.value).toBe('18:00');
        expect(enableCheckbox.checked).toBe(true);
    });

    it('updates preferences when form is submitted', async () => {
        render(<NotificationPreferences />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByLabelText('Digest Time')).toBeInTheDocument();
        });

        // Update preferences
        const timeInput = screen.getByLabelText('Digest Time');
        const enableCheckbox = screen.getByLabelText('Enable daily digest');

        fireEvent.change(timeInput, { target: { value: '19:00' } });
        fireEvent.click(enableCheckbox);

        // Submit form
        const saveButton = screen.getByRole('button', { name: 'Save Preferences' });
        fireEvent.click(saveButton);

        // Verify API call
        await waitFor(() => {
            expect(api.put).toHaveBeenCalledWith('/api/notifications/preferences', {
                digestTime: '19:00',
                isDigestEnabled: false
            });
        });

        // Check success message
        expect(screen.getByText('Preferences updated successfully')).toBeInTheDocument();
    });

    it('displays digest statistics', async () => {
        render(<NotificationPreferences />);

        // Wait for stats to load
        await waitFor(() => {
            expect(screen.getByText('Digest Statistics (Last 30 Days)')).toBeInTheDocument();
        });

        // Check if stats are displayed correctly
        expect(screen.getByText('Total')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('Successful')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('displays digest logs', async () => {
        render(<NotificationPreferences />);

        // Wait for logs to load
        await waitFor(() => {
            expect(screen.getByText('Recent Digest Logs')).toBeInTheDocument();
        });

        // Check if logs are displayed correctly
        expect(screen.getByText('Sent')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('handles API errors gracefully', async () => {
        // Mock API error
        (api.get as jest.Mock).mockRejectedValueOnce(new Error('Failed to load preferences'));

        render(<NotificationPreferences />);

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('Failed to load notification preferences')).toBeInTheDocument();
        });
    });

    it('handles update errors gracefully', async () => {
        // Mock successful get but failed put
        (api.put as jest.Mock).mockRejectedValueOnce(new Error('Failed to update preferences'));

        render(<NotificationPreferences />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.getByLabelText('Digest Time')).toBeInTheDocument();
        });

        // Try to update preferences
        const saveButton = screen.getByRole('button', { name: 'Save Preferences' });
        fireEvent.click(saveButton);

        // Wait for error message
        await waitFor(() => {
            expect(screen.getByText('Failed to update preferences')).toBeInTheDocument();
        });
    });
}); 