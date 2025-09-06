// SMS Reminders Service
// Handles appointment reminders and birthday alerts

const schedule = require('node-schedule');
const moment = require('moment');
const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');
const Salon = require('../models/Salon');
const Subscription = require('../models/Subscription');
const { canSendSms, isWithinLimit } = require('../config/plans');

class SMSRemindersService {
  constructor(smsService) {
    this.smsService = smsService;
    this.jobs = new Map();
    this.templates = {
      appointmentReminder: {
        ja: '【予約リマインダー】{customerName}様、明日{time}に{serviceName}のご予約です。場所: {salonName} {salonAddress}。キャンセルは前日までにご連絡ください。',
        en: 'Reminder: Hi {customerName}, you have an appointment tomorrow at {time} for {serviceName} at {salonName}, {salonAddress}. Please contact us if you need to cancel.'
      },
      birthdayGreeting: {
        ja: '【お誕生日おめでとうございます】{customerName}様、{salonName}より心よりお誕生日のお祝いを申し上げます。特別割引クーポンをご用意しました: {couponCode}',
        en: 'Happy Birthday {customerName}! From all of us at {salonName}. Enjoy this special discount: {couponCode}'
      },
      confirmationMessage: {
        ja: '【予約確認】{customerName}様、{date} {time}に{serviceName}のご予約を承りました。予約番号: {bookingNumber}',
        en: 'Booking confirmed: {customerName}, your {serviceName} appointment is scheduled for {date} at {time}. Booking #: {bookingNumber}'
      }
    };
  }

  async initialize() {
    console.log('Initializing SMS Reminders Service...');
    
    // Schedule daily reminder job at 10:00 AM
    this.scheduleReminderJob();
    
    // Schedule birthday check job at 9:00 AM
    this.scheduleBirthdayJob();
    
    console.log('SMS Reminders Service initialized');
  }

  // Schedule appointment reminders
  scheduleReminderJob() {
    const reminderJob = schedule.scheduleJob('0 10 * * *', async () => {
      console.log('Running daily appointment reminder job...');
      await this.sendAppointmentReminders();
    });
    
    this.jobs.set('appointmentReminders', reminderJob);
  }

  // Schedule birthday greetings
  scheduleBirthdayJob() {
    const birthdayJob = schedule.scheduleJob('0 9 * * *', async () => {
      console.log('Running daily birthday greeting job...');
      await this.sendBirthdayGreetings();
    });
    
    this.jobs.set('birthdayGreetings', birthdayJob);
  }

  // Send appointment reminders for tomorrow's appointments
  async sendAppointmentReminders() {
    try {
      const tomorrow = moment().add(1, 'day').startOf('day');
      const dayAfter = moment().add(1, 'day').endOf('day');

      // Get all appointments for tomorrow
      const appointments = await Appointment.find({
        date: {
          $gte: tomorrow.toDate(),
          $lte: dayAfter.toDate()
        },
        status: 'confirmed',
        reminderSent: { $ne: true }
      })
      .populate('salon')
      .populate('customer')
      .populate('service')
      .populate('staff');

      console.log(`Found ${appointments.length} appointments for tomorrow`);

      for (const appointment of appointments) {
        try {
          // Check if salon has SMS reminders enabled
          const canSend = await this.canSendReminder(appointment.salon._id);
          if (!canSend) {
            console.log(`Skipping reminder for salon ${appointment.salon._id} - feature not available or limit reached`);
            continue;
          }

          // Prepare SMS content
          const message = this.formatMessage('appointmentReminder', {
            customerName: appointment.customer.name,
            time: moment(appointment.startTime).format('HH:mm'),
            serviceName: appointment.service.name,
            salonName: appointment.salon.name,
            salonAddress: appointment.salon.address
          }, appointment.customer.preferredLanguage || 'ja');

          // Send SMS
          const result = await this.smsService.sendSMS({
            to: appointment.customer.phone,
            body: message,
            tenantId: appointment.salon._id,
            type: 'appointmentReminder',
            metadata: {
              appointmentId: appointment._id,
              customerId: appointment.customer._id
            }
          });

          if (result.success) {
            // Mark reminder as sent
            appointment.reminderSent = true;
            appointment.reminderSentAt = new Date();
            await appointment.save();

            // Update salon SMS usage
            await this.incrementSmsUsage(appointment.salon._id);

            console.log(`Reminder sent for appointment ${appointment._id}`);
          }
        } catch (error) {
          console.error(`Failed to send reminder for appointment ${appointment._id}:`, error);
        }
      }

      console.log('Appointment reminder job completed');
    } catch (error) {
      console.error('Error in appointment reminder job:', error);
    }
  }

  // Send birthday greetings
  async sendBirthdayGreetings() {
    try {
      const today = moment().startOf('day');
      
      // Get all customers with birthdays today
      const customers = await Customer.find({
        $expr: {
          $and: [
            { $eq: [{ $dayOfMonth: '$birthday' }, today.date()] },
            { $eq: [{ $month: '$birthday' }, today.month() + 1] }
          ]
        },
        birthdayGreetingSent: {
          $not: {
            $gte: today.toDate()
          }
        }
      }).populate('salon');

      console.log(`Found ${customers.length} customers with birthdays today`);

      for (const customer of customers) {
        try {
          // Check if salon has birthday alerts enabled
          const canSend = await this.canSendBirthdayGreeting(customer.salon._id);
          if (!canSend) {
            console.log(`Skipping birthday greeting for salon ${customer.salon._id} - feature not available`);
            continue;
          }

          // Generate birthday coupon
          const couponCode = this.generateBirthdayCoupon(customer);

          // Prepare SMS content
          const message = this.formatMessage('birthdayGreeting', {
            customerName: customer.name,
            salonName: customer.salon.name,
            couponCode: couponCode
          }, customer.preferredLanguage || 'ja');

          // Send SMS
          const result = await this.smsService.sendSMS({
            to: customer.phone,
            body: message,
            tenantId: customer.salon._id,
            type: 'birthdayGreeting',
            metadata: {
              customerId: customer._id,
              couponCode: couponCode
            }
          });

          if (result.success) {
            // Mark birthday greeting as sent
            customer.birthdayGreetingSent = new Date();
            customer.birthdayCoupon = {
              code: couponCode,
              validUntil: moment().add(30, 'days').toDate(),
              used: false
            };
            await customer.save();

            // Update salon SMS usage
            await this.incrementSmsUsage(customer.salon._id);

            console.log(`Birthday greeting sent to customer ${customer._id}`);
          }
        } catch (error) {
          console.error(`Failed to send birthday greeting to customer ${customer._id}:`, error);
        }
      }

      console.log('Birthday greeting job completed');
    } catch (error) {
      console.error('Error in birthday greeting job:', error);
    }
  }

  // Send appointment confirmation
  async sendAppointmentConfirmation(appointment) {
    try {
      // Check if salon can send confirmations
      const canSend = await this.canSendConfirmation(appointment.salon._id);
      if (!canSend) {
        console.log(`Cannot send confirmation for salon ${appointment.salon._id} - feature not available`);
        return { success: false, reason: 'Feature not available in current plan' };
      }

      // Populate references if needed
      if (!appointment.populated('customer')) {
        await appointment.populate('customer salon service');
      }

      // Prepare SMS content
      const message = this.formatMessage('confirmationMessage', {
        customerName: appointment.customer.name,
        date: moment(appointment.date).format('YYYY/MM/DD'),
        time: moment(appointment.startTime).format('HH:mm'),
        serviceName: appointment.service.name,
        bookingNumber: appointment.bookingNumber
      }, appointment.customer.preferredLanguage || 'ja');

      // Send SMS
      const result = await this.smsService.sendSMS({
        to: appointment.customer.phone,
        body: message,
        tenantId: appointment.salon._id,
        type: 'confirmationMessage',
        metadata: {
          appointmentId: appointment._id,
          customerId: appointment.customer._id
        }
      });

      if (result.success) {
        // Update salon SMS usage
        await this.incrementSmsUsage(appointment.salon._id);
        
        appointment.confirmationSent = true;
        appointment.confirmationSentAt = new Date();
        await appointment.save();
      }

      return result;
    } catch (error) {
      console.error('Error sending appointment confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if salon can send reminders
  async canSendReminder(salonId) {
    const subscription = await Subscription.findOne({ salon: salonId });
    if (!subscription || !subscription.isActive()) {
      return false;
    }

    // Check if plan has SMS reminders
    if (!canSendSms(subscription.planId, 'appointmentReminders')) {
      return false;
    }

    // Check SMS limit
    const currentUsage = subscription.usage.currentMonth.smsCount;
    return isWithinLimit(subscription.planId, 'maxSmsPerMonth', currentUsage);
  }

  // Check if salon can send birthday greetings
  async canSendBirthdayGreeting(salonId) {
    const subscription = await Subscription.findOne({ salon: salonId });
    if (!subscription || !subscription.isActive()) {
      return false;
    }

    // Check if plan has birthday alerts
    if (!hasFeature(subscription.planId, 'birthdayAlerts')) {
      return false;
    }

    // Check SMS limit
    const currentUsage = subscription.usage.currentMonth.smsCount;
    return isWithinLimit(subscription.planId, 'maxSmsPerMonth', currentUsage);
  }

  // Check if salon can send confirmations
  async canSendConfirmation(salonId) {
    const subscription = await Subscription.findOne({ salon: salonId });
    if (!subscription || !subscription.isActive()) {
      return false;
    }

    // Check if plan has SMS capability
    if (!canSendSms(subscription.planId, 'confirmationMessages')) {
      return false;
    }

    // Check SMS limit
    const currentUsage = subscription.usage.currentMonth.smsCount;
    return isWithinLimit(subscription.planId, 'maxSmsPerMonth', currentUsage);
  }

  // Increment SMS usage counter
  async incrementSmsUsage(salonId) {
    await Subscription.findOneAndUpdate(
      { salon: salonId },
      { 
        $inc: { 
          'usage.currentMonth.smsCount': 1,
          'usage.totalUsage.smsCount': 1
        }
      }
    );
  }

  // Format message with template
  formatMessage(templateKey, variables, language = 'ja') {
    let template = this.templates[templateKey][language] || this.templates[templateKey]['ja'];
    
    // Replace variables in template
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{${key}}`, 'g');
      template = template.replace(regex, variables[key]);
    });
    
    return template;
  }

  // Generate birthday coupon code
  generateBirthdayCoupon(customer) {
    const prefix = 'BDAY';
    const year = moment().format('YY');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${year}${random}`;
  }

  // Get reminder statistics
  async getReminderStats(salonId) {
    const subscription = await Subscription.findOne({ salon: salonId });
    
    const stats = {
      currentMonthSmsCount: subscription?.usage.currentMonth.smsCount || 0,
      monthlyLimit: subscription ? 
        (subscription.planDetails.features.maxSmsPerMonth === -1 ? 
          'Unlimited' : subscription.planDetails.features.maxSmsPerMonth) : 0,
      remainingSms: subscription && subscription.planDetails.features.maxSmsPerMonth !== -1 ?
        subscription.planDetails.features.maxSmsPerMonth - subscription.usage.currentMonth.smsCount : 'Unlimited',
      features: {
        appointmentReminders: canSendSms(subscription?.planId || 'LIGHT', 'appointmentReminders'),
        birthdayGreetings: hasFeature(subscription?.planId || 'LIGHT', 'birthdayAlerts'),
        confirmationMessages: canSendSms(subscription?.planId || 'LIGHT', 'confirmationMessages')
      }
    };
    
    return stats;
  }

  // Stop all scheduled jobs
  stop() {
    this.jobs.forEach((job, name) => {
      job.cancel();
      console.log(`Cancelled job: ${name}`);
    });
    this.jobs.clear();
  }
}

module.exports = SMSRemindersService;