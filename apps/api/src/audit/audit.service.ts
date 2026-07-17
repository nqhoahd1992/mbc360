import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string;
  projectId?: string;
  entityType: string; // e.g. "gate_record", "sign_off", "register_row"
  entityId: string;
  action: string; // e.g. "gate.decision", "signoff.signed", "signoff.invalidated"
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

// Append-only audit trail (BACKEND_PLAN principle 1, decision A4/B4): every
// business mutation records an AuditEvent. Rows are never updated or deleted;
// "undoing" an approval is a new event referenced by invalidatedByEventId.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  // Pass the surrounding transaction client so the mutation and its audit row
  // commit atomically — a business write without its audit row must not exist.
  async record(entry: AuditEntry, tx: Prisma.TransactionClient = this.prisma) {
    return tx.auditEvent.create({
      data: {
        actorId: entry.actorId,
        projectId: entry.projectId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        before: entry.before,
        after: entry.after,
      },
    });
  }
}
