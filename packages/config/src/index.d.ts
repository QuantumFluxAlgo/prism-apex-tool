import { z } from 'zod';
export type AccountPhase = 'eval' | 'funded';
declare const accountSchema: z.ZodObject<
  {
    id: z.ZodString;
    phase: z.ZodEnum<['eval', 'funded']>;
    maxContracts: z.ZodNumber;
    bufferCleared: z.ZodBoolean;
  },
  'strip',
  z.ZodTypeAny,
  {
    maxContracts: number;
    phase: 'eval' | 'funded';
    id: string;
    bufferCleared: boolean;
  },
  {
    maxContracts: number;
    phase: 'eval' | 'funded';
    id: string;
    bufferCleared: boolean;
  }
>;
export type AccountConfig = z.infer<typeof accountSchema>;
export declare function loadRegistry(): {
  accounts: AccountConfig[];
};
export {};
//# sourceMappingURL=index.d.ts.map
