import { db, activitiesTable, auditLogsTable } from "@workspace/db";

export async function logActivity(data: {
  type: string;
  description: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  userId?: number;
  metadata?: string;
}) {
  try {
    await db.insert(activitiesTable).values({
      type: data.type,
      description: data.description,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      userId: data.userId,
      metadata: data.metadata,
    });
  } catch {
    // Non-critical, don't throw
  }
}

export async function logAudit(data: {
  userId?: number;
  action: string;
  entityType: string;
  entityId?: number;
  description: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogsTable).values({
      userId: data.userId,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      description: data.description,
      oldValue: data.oldValue,
      newValue: data.newValue,
      ipAddress: data.ipAddress,
    });
  } catch {
    // Non-critical
  }
}
