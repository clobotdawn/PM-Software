import { query } from '../config/database.js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create email transporter
let transporter = null;
if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
}

/**
 * Send in-app notification
 */
export const sendNotification = async (userId, title, message, notificationType, relatedProjectId = null) => {
    await query(
        `INSERT INTO notifications (user_id, title, message, notification_type, related_project_id)
     VALUES ($1, $2, $3, $4, $5)`,
        [userId, title, message, notificationType, relatedProjectId]
    );

    // Also send email if configured
    if (transporter) {
        try {
            const userResult = await query('SELECT email, first_name FROM users WHERE id = $1', [userId]);
            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                await sendEmail(user.email, title, message);
            }
        } catch (error) {
            console.error('Failed to send email notification:', error);
        }
    }
};

/**
 * Send email notification
 */
export const sendEmail = async (to, subject, text, html = null) => {
    if (!transporter) {
        console.log('Email not configured, skipping email to:', to);
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`,
        });
        console.log('Email sent to:', to);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, unreadOnly = false) => {
    let queryText = `
    SELECT n.*, p.name as project_name
    FROM notifications n
    LEFT JOIN projects p ON n.related_project_id = p.id
    WHERE n.user_id = $1
  `;

    if (unreadOnly) {
        queryText += ' AND n.is_read = false';
    }

    queryText += ' ORDER BY n.created_at DESC LIMIT 50';

    const result = await query(queryText, [userId]);
    return result.rows;
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
    const result = await query(
        'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
        [notificationId, userId]
    );
    return result.rows[0];
};

/**
 * Mark all notifications as read for a user
 */
export const markAllAsRead = async (userId) => {
    await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
        [userId]
    );
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (userId) => {
    const result = await query(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
    );
    return parseInt(result.rows[0].count);
};

/**
 * Send batch notifications to multiple users
 */
export const sendBatchNotifications = async (userIds, title, message, notificationType, relatedProjectId = null) => {
    for (const userId of userIds) {
        await sendNotification(userId, title, message, notificationType, relatedProjectId);
    }
};

export default {
    sendNotification,
    sendEmail,
    getUserNotifications,
    markNotificationAsRead,
    markAllAsRead,
    getUnreadCount,
    sendBatchNotifications
};
