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
    id: number;
    projectId: number;
    createdAt: string;
    description: string;
    updatedAt: string;
    position: number;
    amount: number;
    entryDate: string;
    bank: string;
}, {
    id: number;
    projectId: number;
    createdAt: string;
    description: string;
    updatedAt: string;
    position: number;
    amount: number;
    entryDate: string;
    bank: string;
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
    description: string;
    amount: number;
    bank: string;
    entryDate?: string | undefined;
}, {
    amount: number;
    description?: string | undefined;
    entryDate?: string | undefined;
    bank?: string | undefined;
}>;
export type CreateSpendingEntryRequest = z.infer<typeof createSpendingEntryRequestSchema>;
export declare const updateSpendingEntryRequestSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    entryDate: z.ZodOptional<z.ZodString>;
    bank: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    amount?: number | undefined;
    entryDate?: string | undefined;
    bank?: string | undefined;
}, {
    description?: string | undefined;
    amount?: number | undefined;
    entryDate?: string | undefined;
    bank?: string | undefined;
}>;
export type UpdateSpendingEntryRequest = z.infer<typeof updateSpendingEntryRequestSchema>;
export declare const importSpendingEntriesRequestSchema: z.ZodObject<{
    replace: z.ZodDefault<z.ZodBoolean>;
    entries: z.ZodArray<z.ZodObject<{
        description: z.ZodDefault<z.ZodString>;
        amount: z.ZodNumber;
        entryDate: z.ZodOptional<z.ZodString>;
        bank: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        amount: number;
        bank: string;
        entryDate?: string | undefined;
    }, {
        amount: number;
        description?: string | undefined;
        entryDate?: string | undefined;
        bank?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entries: {
        description: string;
        amount: number;
        bank: string;
        entryDate?: string | undefined;
    }[];
    replace: boolean;
}, {
    entries: {
        amount: number;
        description?: string | undefined;
        entryDate?: string | undefined;
        bank?: string | undefined;
    }[];
    replace?: boolean | undefined;
}>;
export type ImportSpendingEntriesRequest = z.infer<typeof importSpendingEntriesRequestSchema>;
export interface ImportSpendingResponse {
    entries: SpendingEntryResponse[];
    totalAmount: number;
}
