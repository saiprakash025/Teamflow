// server/src/events/index.js
const EventEmitter = require('events');
const Notification = require('../models/Notification');
const User = require('../models/User');

function sendEmailStub(toUserId, message) {
  console.log(`[EMAIL STUB] to user=${toUserId}: ${message}`);
}

class NotificationBus extends EventEmitter {}

const notificationBus = new NotificationBus();

async function sendEmailStub(toUserId, message) {
  const user = await User.findById(toUserId).select('emailOptOut');
  if (!user) return;

  if (user.emailOptOut) {
    console.log(`[EMAIL STUB] user=${toUserId} has opted out of emails.`);
    return;
  }
   console.log(`[EMAIL STUB] to user=${toUserId}: ${message}`);
}

// Listener: create notification + send email stub
notificationBus.on('notify', async (payload) => {
  const { userId, type, message,entityId } = payload;

  try {
    
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const existing = await Notification.findOne({
      user: userId,
      type,
      createdAt: { $gte: tenMinutesAgo },
      // If you add entityId to Notification, include it here
    });

    if (existing) {
      console.log(
        `Dedup: skipping duplicate notification for user=${userId}, type=${type}`
      );
      return;
    }
    // Dedup stub: check if same type+message in last X mins
    const notification = await Notification.create({
      user: userId,
      type,
      message,
    });

    await sendEmailStub(userId, message);

    console.log('Notification created:', notification._id.toString());
  } catch (err) {
    console.error('NotificationBus notify error:', err);
  }
});

// Helper to emit notification
function emitNotification(userId, type, message,entityId) {
  notificationBus.emit('notify', { userId, type, message,entityId });
}

module.exports = {
  notificationBus,
  emitNotification,
};