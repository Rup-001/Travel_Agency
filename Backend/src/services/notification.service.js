const mongoose = require("mongoose");
const httpStatus = require("http-status");
const { Notification, User } = require("../models");
const logger = require("../config/logger");
const ApiError = require("../utils/ApiError");

/**
 * Send notification to specific admins based on their settings
 * @param {string} type - 'newBooking', 'paymentUpdate', 'lowInventory'
 * @param {Object} notificationData - { title, content, transactionId, icon }
 */
const sendNotificationToAdmins = async (type, notificationData) => {
  try {
    // 1. Find all admins/superadmins who have this notification type enabled
    // Using $ne: false so that if the field is missing (default), it still finds them
    const admins = await User.find({
      role: { $in: ["admin", "superAdmin"] },
      [`notificationSettings.${type}`]: { $ne: false },
      isDeleted: false,
    });

    console.log(`Notification: Found ${admins.length} admins to notify for type: ${type}`);

    if (admins.length === 0) {
      console.log(`Notification: No admins found with ${type} enabled.`);
      return;
    }

    // 2. Prepare and save notifications for each admin
    const notifications = admins.map((admin) => ({
      userId: admin._id,
      title: notificationData.title,
      content: notificationData.content,
      transactionId: notificationData.transactionId || null,
      type: type,
      status: "unread",
      priority: notificationData.priority || "medium",
    }));

    const savedNotifications = await Notification.insertMany(notifications);
    console.log(`Saved ${savedNotifications.length} notifications to database.`);

    // 3. Emit real-time notification via Socket.io
    if (global.io) {
      console.log("Socket.IO: global.io is available, emitting notifications...");
      savedNotifications.forEach((notif) => {
        const roomName = `room${notif.userId.toString()}`;
        console.log(`Socket.IO: Emitting to ${roomName} for event 'new-notification'`);
        global.io.to(roomName).emit("new-notification", notif);
        logger.info(`Notification emitted to room: ${roomName}`);
      });
    } else {
      console.warn("Socket.IO: global.io is NOT available!");
    }
  } catch (error) {
    logger.error("Error sending notification:", error);
  }
};

/**
 * Query for notifications
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryNotifications = async (filter, options) => {
  const notifications = await Notification.paginate(filter, options);
  return notifications;
};

/**
 * Mark notification as read
 * @param {ObjectId} notificationId
 * @returns {Promise<Notification>}
 */
const markAsRead = async (notificationId) => {
  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, "Notification not found");
  }
  notification.status = "read";
  await notification.save();
  return notification;
};

/**
 * Mark all notifications as read for a user
 * @param {ObjectId} userId
 * @returns {Promise<void>}
 */
const markAllAsRead = async (userId) => {
  // Convert to ObjectId if it's a string to ensure query matches
  const id = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  const result = await Notification.updateMany({ userId: id, status: "unread" }, { status: "read" });
  logger.info(`Marked all notifications as read for user ${id}. Modified count: ${result.modifiedCount}`);
};

module.exports = {
  sendNotificationToAdmins,
  queryNotifications,
  markAsRead,
  markAllAsRead,
};
