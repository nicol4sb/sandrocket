import { z } from 'zod';
export declare const spendingEntryResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    description: z.ZodString;
    amount: z.ZodNumber;
    entryDate: z.ZodString;
    bank: z.ZodString;
    paid: z.ZodBoolean;
    debtPaid: z.ZodBoolean;
    position: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amount: number;
    paid: boolean;
    id: number;
    projectId: number;
    description: string;
    entryDate: string;
    bank: string;
    debtPaid: boolean;
    position: number;
    createdAt: string;
    updatedAt: string;
}, {
    amount: number;
    paid: boolean;
    id: number;
    projectId: number;
    description: string;
    entryDate: string;
    bank: string;
    debtPaid: boolean;
    position: number;
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
    paid: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    debtPaid: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    paid: boolean;
    description: string;
    bank: string;
    debtPaid: boolean;
    entryDate?: string | undefined;
}, {
    amount: number;
    paid?: boolean | undefined;
    description?: string | undefined;
    entryDate?: string | undefined;
    bank?: string | undefined;
    debtPaid?: boolean | undefined;
}>;
export type CreateSpendingEntryRequest = z.infer<typeof createSpendingEntryRequestSchema>;
export declare const updateSpendingEntryRequestSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    entryDate: z.ZodOptional<z.ZodString>;
    bank: z.ZodOptional<z.ZodString>;
    paid: z.ZodOptional<z.ZodBoolean>;
    debtPaid: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    amount?: number | undefined;
    paid?: boolean | undefined;
    description?: string | undefined;
    entryDate?: string | undefined;
    bank?: string | undefined;
    debtPaid?: boolean | undefined;
}, {
    amount?: number | undefined;
    paid?: boolean | undefined;
    description?: string | undefined;
    entryDate?: string | undefined;
    bank?: string | undefined;
    debtPaid?: boolean | undefined;
}>;
export type UpdateSpendingEntryRequest = z.infer<typeof updateSpendingEntryRequestSchema>;
export declare const importSpendingEntriesRequestSchema: z.ZodObject<{
    replace: z.ZodDefault<z.ZodBoolean>;
    entries: z.ZodArray<z.ZodObject<{
        description: z.ZodDefault<z.ZodString>;
        amount: z.ZodNumber;
        entryDate: z.ZodOptional<z.ZodString>;
        bank: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        paid: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        debtPaid: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        paid: boolean;
        description: string;
        bank: string;
        debtPaid: boolean;
        entryDate?: string | undefined;
    }, {
        amount: number;
        paid?: boolean | undefined;
        description?: string | undefined;
        entryDate?: string | undefined;
        bank?: string | undefined;
        debtPaid?: boolean | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entries: {
        amount: number;
        paid: boolean;
        description: string;
        bank: string;
        debtPaid: boolean;
        entryDate?: string | undefined;
    }[];
    replace: boolean;
}, {
    entries: {
        amount: number;
        paid?: boolean | undefined;
        description?: string | undefined;
        entryDate?: string | undefined;
        bank?: string | undefined;
        debtPaid?: boolean | undefined;
    }[];
    replace?: boolean | undefined;
}>;
export type ImportSpendingEntriesRequest = z.infer<typeof importSpendingEntriesRequestSchema>;
export interface ImportSpendingResponse {
    entries: SpendingEntryResponse[];
    totalAmount: number;
}
