import { Appointment } from './types';

const BASE_URL = 'https://www.googleapis.com/calendar/v3';

// Formats a generic Google Calendar API event into our app's visual appointment type
function formatGoogleEvent(event: any): Appointment {
  return {
    id: event.id,
    customerName: event.summary?.replace('WhatsApp Booking: ', '') || 'Google Event',
    customerPhone: '',
    email: event.attendees?.[0]?.email || '',
    start: event.start?.dateTime || event.start?.date || new Date().toISOString(),
    end: event.end?.dateTime || event.end?.date || new Date().toISOString(),
    summary: event.summary || 'Scheduled Meeting',
    notes: event.description || '',
    syncedWithGoogle: true,
    googleEventId: event.id,
  };
}

/**
 * Fetch calendar events from primary Google Calendar
 */
export async function listGoogleCalendarEvents(accessToken: string): Promise<Appointment[]> {
  try {
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1); // 1 month prior

    const url = `${BASE_URL}/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin.toISOString())}&maxResults=50`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      const errText = await response.text();
      console.error('Google Calendar List Error:', errText);
      throw new Error(`Failed to retrieve events: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.items || [];
    return events.map((event: any) => formatGoogleEvent(event));
  } catch (error) {
    console.error('Error fetching Google Calendar:', error);
    throw error;
  }
}

// Helper to sanitize date-times to RFC3339 compatibility with timezone offsets
function ensureRfc3339(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  // If it already ends with Z or has a timezone offset, return as-is
  if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (e) {
    console.error('Error parsing date string in RFC3339 conversion:', e);
  }
  // Safe fallback: append Z
  return dateStr + 'Z';
}

/**
 * Insert a booking event into the Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  appointment: Omit<Appointment, 'id' | 'syncedWithGoogle'>
): Promise<Appointment> {
  try {
    const url = `${BASE_URL}/calendars/primary/events`;
    const localTimeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
    
    const body = {
      summary: `WhatsApp Booking: ${appointment.customerName}`,
      description: `${appointment.summary}\nPhone: ${appointment.customerPhone}\n\nBooked autonomously via WhatsApp Business AI Platform.`,
      start: {
        dateTime: ensureRfc3339(appointment.start),
        timeZone: localTimeZone,
      },
      end: {
        dateTime: ensureRfc3339(appointment.end),
        timeZone: localTimeZone,
      },
      attendees: appointment.email ? [{ email: appointment.email }] : [],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Calendar Create Error:', errText);
      throw new Error(`Failed to create meeting event: ${response.statusText}`);
    }

    const createdEvent = await response.json();
    return formatGoogleEvent(createdEvent);
  } catch (error) {
    console.error('Error creating Google Calendar appointment:', error);
    throw error;
  }
}

/**
 * Delete an event from the primary Google Calendar
 */
export async function deleteGoogleCalendarEvent(accessToken: string, eventId: string): Promise<boolean> {
  try {
    const url = `${BASE_URL}/calendars/primary/events/${eventId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Google Calendar Delete Error:', errText);
      throw new Error(`Failed to cancel event: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error removing calendar event:', error);
    throw error;
  }
}
