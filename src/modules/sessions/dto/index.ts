export interface SessionResponseDto {
  id: string;
  userId: string | null;
  tokenId: string;
  status: string;
  expiresAt: string | null;
}
