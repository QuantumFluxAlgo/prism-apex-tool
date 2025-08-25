export type AccountFile = {
  id: string;
  maxContracts: number;
  bufferCleared: boolean;
  updatedAt: string;
  notes?: string;
  lastSuggestedContracts?: number;
  lastSuggestedAt?: string;
};
