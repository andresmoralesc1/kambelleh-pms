import prisma from '../config/database.js';

/**
 * Log an activity to the ActivityLog table.
 * Failures are silent — do not break main operations.
 *
 * @param {Object} params
 * @param {string} params.userId    - ID of the user performing the action
 * @param {string} params.action    - Human-readable action label (e.g. 'CREATED', 'UPDATED', 'PAID')
 * @param {string} params.resource  - Resource type (e.g. 'RESERVATION', 'ROOM', 'GUEST', 'PAYMENT')
 * @param {string} [params.resourceId] - Optional resource UUID
 * @param {Object} [params.details] - Optional JSON details
 * @param {string} [params.ipAddress] - Optional IP address from req.ip
 */
export async function logActivity({ userId, action, resource, resourceId = null, details = null, ipAddress = null }) {
  try {
    await prisma.activityLog.create({
      data: { userId, action, resource, resourceId, details, ipAddress },
    });
  } catch (err) {
    // Silent failure — do not propagate
    console.error('[logActivity] Failed to write activity log:', err.message);
  }
}
