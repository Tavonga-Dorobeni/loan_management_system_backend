export interface ActivityLogResponseDto {
  id: number;
  actorUserId: number | null;
  actorRole: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  sourceType: string;
  sourceReference: string | null;
  createdAt: string;
}
