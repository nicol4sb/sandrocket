import { z } from 'zod';
export declare const spendingEntryResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    description: z.ZodString;
    amount: z.ZodNumber;
    entryDate: z.ZodString;
    bank: z.ZodString;
    position: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    projectId: number;
    amount: number;
    entryDate: string;
    position: number;
    id: number;
    description: string;
    bank: string;
    createdAt: string;
    updatedAt: string;
}, {
    projectId: number;
    amount: number;
    entryDate: string;
    position: number;
    id: number;
    description: string;
    bank: string;
    createdAt: string;
    updatedAt: string;
}>;
export type SpendingEntryResponse = z.infer<typeof spendingEntryResponseSchema>;
export interface ListSpendingResponse {
    visible: boolean;
    entries: SpendingEntryResponse[];
    totalAmount: number;
}
export declare const updateSpendingVisibilityRequestSchema: z.ZodObject<{
    visible: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    visible: boolean;
}, {
    visible: boolean;
}>;
export type UpdateSpendingVisibilityRequest = z.infer<typeof updateSpendingVisibilityRequestSchema>;
export declare const createSpendingEntryRequestSchema: z.ZodObject<{
    description: z.ZodDefault<z.ZodString>;
    amount: z.ZodNumber;
    entryDate: z.ZodOptional<z.ZodString>;
    bank: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    description: string;
    bank: string;
    entryDate?: string | undefined;
}, {
    amount: number;
    entryDate?: string | undefined;
    description?: string | undefined;
    bank?: string | undefined;
}>;
export type CreateSpendingEntryRequest = z.infer<typeof createSpendingEntryRequestSchema>;
export declare const updateSpendingEntryRequestSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    entryDate: z.ZodOptional<z.ZodString>;
    bank: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount?: number | undefined;
    entryDate?: string | undefined;
    description?: string | undefined;
    bank?: string | undefined;
}, {
    amount?: number | undefined;
    entryDate?: string | undefined;
    description?: string | undefined;
    bank?: string | undefined;
}>;
export type UpdateSpendingEntryRequest = z.infer<typeof updateSpendingEntryRequestSchema>;
