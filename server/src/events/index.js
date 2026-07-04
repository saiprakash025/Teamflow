// server/src/events/index.js
const EventEmitter = require('events');
const Notification = require('../models/Notification');

function sendEmailStub(toUserId, message) {
  console.log(`[EMAIL STUB] to user=${toUserId}: ${message}`);
}

class NotificationBus extends EventEmitter {}

const notificationBus = new NotificationBus();

// Listener: create notification + send email stub
notificationBus.on('notify', async (payload) => {
  const { userId, type, message } = payload;

  try {
    // Dedup stub: check if same type+message in last X mins
    const notification = await Notification.create({
      user: userId,
      type,
      message,
    });

    sendEmailStub(userId, message);

    console.log('Notification created:', notification._id.toString());
  } catch (err) {
    console.error('NotificationBus notify error:', err);
  }
});

// Helper to emit notification
function emitNotification(userId, type, message) {
  notificationBus.emit('notify', { userId, type, message });
}

module.exports = {
  notificationBus,
  emitNotification,
};