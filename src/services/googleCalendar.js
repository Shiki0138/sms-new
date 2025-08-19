// Google Calendar Integration Service
// Syncs salon appointments with Google Calendar

const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.scopes = ['https://www.googleapis.com/auth/calendar'];
  }
  
  // Generate auth URL for OAuth flow
  getAuthUrl(salonId) {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.scopes,
      state: salonId // Pass salon ID to link tokens later
    });
  }
  
  // Exchange authorization code for tokens
  async getTokens(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }
  
  // Set credentials for API calls
  setCredentials(tokens) {
    this.oauth2Client.setCredentials(tokens);
  }
  
  // Create calendar event for appointment
  async createAppointmentEvent(appointment, tokens) {
    this.setCredentials(tokens);
    
    const event = {
      summary: `${appointment.service.name} - ${appointment.customer.name}`,
      description: this.buildEventDescription(appointment),
      start: {
        dateTime: appointment.startTime,
        timeZone: 'Asia/Tokyo'
      },
      end: {
        dateTime: appointment.endTime,
        timeZone: 'Asia/Tokyo'
      },
      location: appointment.salon.address,
      attendees: [
        {
          email: appointment.customer.email,
          displayName: appointment.customer.name
        }
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 } // 1 hour before
        ]
      },
      colorId: this.getEventColor(appointment.status)
    };
    
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        sendNotifications: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }
  
  // Update existing calendar event
  async updateAppointmentEvent(eventId, appointment, tokens) {
    this.setCredentials(tokens);
    
    const event = {
      summary: `${appointment.service.name} - ${appointment.customer.name}`,
      description: this.buildEventDescription(appointment),
      start: {
        dateTime: appointment.startTime,
        timeZone: 'Asia/Tokyo'
      },
      end: {
        dateTime: appointment.endTime,
        timeZone: 'Asia/Tokyo'
      },
      location: appointment.salon.address,
      colorId: this.getEventColor(appointment.status)
    };
    
    try {
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event,
        sendNotifications: true
      });
      
      return response.data;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }
  
  // Delete calendar event
  async deleteAppointmentEvent(eventId, tokens) {
    this.setCredentials(tokens);
    
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
        sendNotifications: true
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }
  
  // Get calendar events for a date range
  async getEvents(startDate, endDate, tokens) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      return response.data.items;
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }
  
  // Check if a time slot is available
  async checkAvailability(startTime, endTime, tokens) {
    this.setCredentials(tokens);
    
    try {
      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: 'primary' }]
        }
      });
      
      const busy = response.data.calendars.primary.busy;
      return busy.length === 0;
    } catch (error) {
      console.error('Error checking availability:', error);
      throw new Error('Failed to check calendar availability');
    }
  }
  
  // Batch sync multiple appointments
  async batchSyncAppointments(appointments, tokens) {
    this.setCredentials(tokens);
    
    const batch = google.newBatch();
    const results = [];
    
    for (const appointment of appointments) {
      const event = {
        summary: `${appointment.service.name} - ${appointment.customer.name}`,
        description: this.buildEventDescription(appointment),
        start: {
          dateTime: appointment.startTime,
          timeZone: 'Asia/Tokyo'
        },
        end: {
          dateTime: appointment.endTime,
          timeZone: 'Asia/Tokyo'
        },
        location: appointment.salon.address,
        colorId: this.getEventColor(appointment.status)
      };
      
      if (appointment.googleEventId) {
        // Update existing event
        batch.add(this.calendar.events.update({
          calendarId: 'primary',
          eventId: appointment.googleEventId,
          resource: event
        }));
      } else {
        // Create new event
        batch.add(this.calendar.events.insert({
          calendarId: 'primary',
          resource: event
        }));
      }
    }
    
    try {
      const batchResponse = await batch;
      return batchResponse;
    } catch (error) {
      console.error('Error in batch sync:', error);
      throw new Error('Failed to sync appointments');
    }
  }
  
  // Helper: Build event description
  buildEventDescription(appointment) {
    const lines = [
      `サービス: ${appointment.service.name}`,
      `お客様: ${appointment.customer.name}`,
      `電話: ${appointment.customer.phone}`,
      `メール: ${appointment.customer.email}`,
      `スタッフ: ${appointment.staff?.name || '指名なし'}`,
      `料金: ¥${appointment.service.price.toLocaleString()}`,
      `所要時間: ${appointment.service.duration}分`
    ];
    
    if (appointment.notes) {
      lines.push(`備考: ${appointment.notes}`);
    }
    
    lines.push('', `予約番号: ${appointment.bookingNumber}`);
    
    return lines.join('\n');
  }
  
  // Helper: Get color based on appointment status
  getEventColor(status) {
    const colorMap = {
      confirmed: '2', // Green
      pending: '5', // Yellow
      cancelled: '11', // Red
      completed: '9', // Blue
      noshow: '8' // Gray
    };
    
    return colorMap[status] || '1'; // Default blue
  }
  
  // Refresh access token if expired
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw new Error('Failed to refresh access token');
    }
  }
  
  // Revoke access
  async revokeAccess(tokens) {
    try {
      await this.oauth2Client.revokeCredentials(tokens.access_token);
      return true;
    } catch (error) {
      console.error('Error revoking access:', error);
      throw new Error('Failed to revoke access');
    }
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getGoogleCalendarService: () => {
    if (!instance) {
      instance = new GoogleCalendarService();
    }
    return instance;
  }
};