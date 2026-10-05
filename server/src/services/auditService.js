const AuditLog = require('../models/AuditLog');

const recordAuditLog = async ({
  actionType,
  entityType,
  entityId,
  performedBy,
  performedByEmail = '',
  performedByRole = '',
  changeReason,
  oldValues = null,
  newValues = null,
  ipAddress = '',
  userAgent = '',
}) => {
  try {
    const log = await AuditLog.create({
      actionType,
      entityType,
      entityId,
      performedBy,
      performedByEmail,
      performedByRole,
      changeReason: changeReason || 'Administrative update',
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    });
    return log;
  } catch (error) {
    console.error('[Audit Log Error] Failed to write audit trail:', error.message);
    // Even if logging fails, do not crash but warn
    return null;
  }
};

module.exports = {
  recordAuditLog,
};
