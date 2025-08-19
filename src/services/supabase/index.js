const userService = require('./user.service');
const customerService = require('./customer.service');
const reservationService = require('./reservation.service');

// Import additional services as they are created
const tenantService = require('./tenant.service');
const messageService = require('./message.service');
const staffService = require('./staff.service');
const serviceService = require('./service.service');

module.exports = {
  userService,
  customerService,
  reservationService,
  tenantService,
  messageService,
  staffService,
  serviceService
};