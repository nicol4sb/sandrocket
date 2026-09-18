import { z } from 'zod';
export declare const spendingLotResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    summaryEntryId: z.ZodNullable<z.ZodNumber>;
    name: z.ZodString;
    description: z.ZodString;
    estimateAmount: z.ZodNumber;
    position: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: number;
    projectId: number;
    description: string;
    position: number;
    createdAt: string;
    updatedAt: string;
    name: string;
    estimateAmount: number;
    summaryEntryId: number | null;
}, {
    id: number;
    projectId: number;
    description: string;
    position: number;
    createdAt: string;
    updatedAt: string;
    name: string;
    estimateAmount: number;
    summaryEntryId: number | null;
}>;
export type SpendingLotResponse = z.infer<typeof spendingLotResponseSchema>;
export declare const createSpendingLotRequestSchema: z.ZodObject<{
    name: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    description: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    estimateAmount: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    description: string;
    name: string;
    estimateAmount: number;
}, {
    description?: string | undefined;
    name?: string | undefined;
    estimateAmount?: number | undefined;
}>;
export type CreateSpendingLotRequest = z.infer<typeof createSpendingLotRequestSchema>;
export declare const updateSpendingLotRequestSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    estimateAmount: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    name?: string | undefined;
    estimateAmount?: number | undefined;
}, {
    description?: string | undefined;
    name?: string | undefined;
    estimateAmount?: number | undefined;
}>;
export type UpdateSpendingLotRequest = z.infer<typeof updateSpendingLotRequestSchema>;
export declare const spendingEntryResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    lotId: z.ZodNullable<z.ZodNumber>;
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
    debtPaid: boolean;
    id: number;
    projectId: number;
    lotId: number | null;
    description: string;
    entryDate: string;
    bank: string;
    position: number;
    createdAt: string;
    updatedAt: string;
}, {
    amount: number;
    paid: boolean;
    debtPaid: boolean;
    id: number;
    projectId: number;
    lotId: number | null;
    description: string;
    entryDate: string;
    bank: string;
    position: number;
    createdAt: string;
    updatedAt: string;
}>;
export type SpendingEntryResponse = z.infer<typeof spendingEntryResponseSchema>;
export interface ListSpendingResponse {
    visible: boolean;
    entries: SpendingEntryResponse[];
    lots: SpendingLotResponse[];
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
    lotId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    lotName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    paid: boolean;
    debtPaid: boolean;
    description: string;
    bank: string;
    lotId?: number | null | undefined;
    entryDate?: string | undefined;
    lotName?: string | undefined;
}, {
    amount: number;
    paid?: boolean | undefined;
    debtPaid?: boolean | undefined;
    lotId?: number | null | undefined;
    description?: string | undefined;
    entryDate?: string | undefined;
    bank?: string | undefined;
    lotName?: string | undefined;
}>;
export type CreateSpendingEntryRequest = z.infer<typeof createSpendingEntryRequestSchema>;
export declare const updateSpendingEntryRequestSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    entryDate: z.ZodOptional<z.ZodString>;
    bank: z.ZodOptional<z.ZodString>;
    paid: z.ZodOptional<z.ZodBoolean>;
    debtPaid: z.ZodOptional<z.ZodBoolean>;
    lotId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    amount?: number | undefined;
    paid?: boolean | undefined;
    debtPaid?: boolean | undefined;
    lotId?: number | null | undefined;
    description?: string | undefined;
    entryDate?: string | undefined;
    bank?: string | undefined;
}, {
    amount?: number | undefined;
    paid?: boolean | undefined;
    debtPaid?: boolean | undefined;
    lotId?: number | null | undefined;
    description?: string | undefined;
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
        paid: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        debtPaid: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        lotId: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        lotName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        paid: boolean;
        debtPaid: boolean;
        description: string;
        bank: string;
        lotId?: number | null | undefined;
        entryDate?: string | undefined;
        lotName?: string | undefined;
    }, {
        amount: number;
        paid?: boolean | undefined;
        debtPaid?: boolean | undefined;
        lotId?: number | null | undefined;
        description?: string | undefined;
        entryDate?: string | undefined;
        bank?: string | undefined;
        lotName?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entries: {
        amount: number;
        paid: boolean;
        debtPaid: boolean;
        description: string;
        bank: string;
        lotId?: number | null | undefined;
        entryDate?: string | undefined;
        lotName?: string | undefined;
    }[];
    replace: boolean;
}, {
    entries: {
        amount: number;
        paid?: boolean | undefined;
        debtPaid?: boolean | undefined;
        lotId?: number | null | undefined;
        description?: string | undefined;
        entryDate?: string | undefined;
        bank?: string | undefined;
        lotName?: string | undefined;
    }[];
    replace?: boolean | undefined;
}>;
export type ImportSpendingEntriesRequest = z.infer<typeof importSpendingEntriesRequestSchema>;
export interface ImportSpendingResponse {
    entries: SpendingEntryResponse[];
    lots: SpendingLotResponse[];
    totalAmount: number;
}
