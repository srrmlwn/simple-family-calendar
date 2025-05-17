import { EventInput } from '../services/eventService';
import moment from 'moment';

export type ValidationStatus = 'valid' | 'invalid' | 'pending';

export interface FieldValidation {
  status: ValidationStatus;
  message?: string;
}

export interface EventValidation {
  title: FieldValidation;
  startTime: FieldValidation;
  endTime: FieldValidation;
  isValid: boolean;
  pendingFields: string[];
}

export type EventStatus = 'editing' | 'saving' | 'saved' | 'error' | 'draft';

export interface EventState {
  status: EventStatus;
  validation: EventValidation;
  error?: string;
}

export function validateEvent(eventData: Partial<EventInput>): EventValidation {
  const validation: EventValidation = {
    title: { status: 'pending' },
    startTime: { status: 'pending' },
    endTime: { status: 'pending' },
    isValid: false,
    pendingFields: []
  };

  // Validate title
  if (!eventData.title?.trim()) {
    validation.title = {
      status: 'invalid',
      message: 'Please add a title for your event'
    };
    validation.pendingFields.push('title');
  } else {
    validation.title = { status: 'valid' };
  }

  // For all-day events, we don't require specific times
  if (eventData.isAllDay) {
    validation.startTime = { status: 'valid' };
    validation.endTime = { status: 'valid' };
  } else {
    // Validate start time for non-all-day events
    if (!eventData.startTime) {
      validation.startTime = {
        status: 'invalid',
        message: 'Please set a start time for your event'
      };
      validation.pendingFields.push('start time');
    } else {
      validation.startTime = { status: 'valid' };
    }

    // Validate end time for non-all-day events
    if (!eventData.endTime) {
      validation.endTime = {
        status: 'invalid',
        message: 'Please set an end time for your event'
      };
      validation.pendingFields.push('end time');
    } else if (moment(eventData.endTime).isSameOrBefore(eventData.startTime)) {
      validation.endTime = {
        status: 'invalid',
        message: 'End time must be after start time'
      };
      validation.pendingFields.push('end time');
    } else {
      validation.endTime = { status: 'valid' };
    }
  }

  // Overall validation
  validation.isValid = 
    validation.title.status === 'valid' &&
    validation.startTime.status === 'valid' &&
    validation.endTime.status === 'valid';

  return validation;
}

export function getValidationMessage(validation: EventValidation): string {
  if (validation.isValid) {
    return 'Great! Your event is ready to save';
  }

  if (validation.pendingFields.length === 1) {
    return `Please add ${validation.pendingFields[0]} for your event`;
  }

  if (validation.pendingFields.length === 2) {
    return `Please add ${validation.pendingFields[0]} and ${validation.pendingFields[1]} for your event`;
  }

  return `Please add ${validation.pendingFields.slice(0, -1).join(', ')} and ${validation.pendingFields[validation.pendingFields.length - 1]} for your event`;
}

export function getEventStatusMessage(state: EventState): string {
  switch (state.status) {
    case 'saved':
      return 'Event has been created. You can review the details below.';
    case 'saving':
      return 'Saving your event...';
    case 'error':
      return state.error || 'Failed to save event. Please try again.';
    case 'draft':
      return getValidationMessage(state.validation);
    default:
      return '';
  }
} 