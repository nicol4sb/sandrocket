import { z } from 'zod';
export declare const summaryEntryResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    description: z.ZodString;
    amount: z.ZodNumber;
    entryDate: z.ZodString;
    accomptePayeDate: z.ZodString;
    paiementCompletDate: z.ZodString;
    position: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: number;
    projectId: number;
    createdAt: string;
    description: string;
    updatedAt: string;
    position: number;
    amount: number;
    entryDate: string;
    accomptePayeDate: string;
    paiementCompletDate: string;
}, {
    id: number;
    projectId: number;
    createdAt: string;
    description: string;
    updatedAt: string;
    position: number;
    amount: number;
    entryDate: string;
    accomptePayeDate: string;
    paiementCompletDate: string;
}>;
export type SummaryEntryResponse = z.infer<typeof summaryEntryResponseSchema>;
export interface ListSummaryResponse {
    visible: boolean;
    entries: SummaryEntryResponse[];
    totalAmount: number;
}
export declare const updateSummaryVisibilityRequestSchema: z.ZodObject<{
    visible: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    visible: boolean;
}, {
    visible: boolean;
}>;
export type UpdateSummaryVisibilityRequest = z.infer<typeof updateSummaryVisibilityRequestSchema>;
export declare const createSummaryEntryRequestSchema: z.ZodObject<{
    description: z.ZodDefault<z.ZodString>;
    amount: z.ZodNumber;
    entryDate: z.ZodOptional<z.ZodString>;
    accomptePayeDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    paiementCompletDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    amount: number;
    entryDate?: string | undefined;
    accomptePayeDate?: string | undefined;
    paiementCompletDate?: string | undefined;
}, {
    amount: number;
    description?: string | undefined;
    entryDate?: string | undefined;
    accomptePayeDate?: string | undefined;
    paiementCompletDate?: string | undefined;
}>;
export type CreateSummaryEntryRequest = z.infer<typeof createSummaryEntryRequestSchema>;
export declare const updateSummaryEntryRequestSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    entryDate: z.ZodOptional<z.ZodString>;
    accomptePayeDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
    paiementCompletDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<"">]>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    amount?: number | undefined;
    entryDate?: string | undefined;
    accomptePayeDate?: string | undefined;
    paiementCompletDate?: string | undefined;
}, {
    description?: string | undefined;
    amount?: number | undefined;
    entryDate?: string | undefined;
    accomptePayeDate?: string | undefined;
    paiementCompletDate?: string | undefined;
}>;
export type UpdateSummaryEntryRequest = z.infer<typeof updateSummaryEntryRequestSchema>;
