import { z } from 'zod';
export declare const summaryEntryResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    lot: z.ZodString;
    fichierRetenu: z.ZodString;
    amount: z.ZodNumber;
    entryDate: z.ZodString;
    position: z.ZodNumber;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: number;
    projectId: number;
    createdAt: string;
    updatedAt: string;
    position: number;
    amount: number;
    entryDate: string;
    lot: string;
    fichierRetenu: string;
}, {
    id: number;
    projectId: number;
    createdAt: string;
    updatedAt: string;
    position: number;
    amount: number;
    entryDate: string;
    lot: string;
    fichierRetenu: string;
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
    lot: z.ZodDefault<z.ZodString>;
    fichierRetenu: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    amount: z.ZodNumber;
    entryDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    lot: string;
    fichierRetenu: string;
    entryDate?: string | undefined;
}, {
    amount: number;
    entryDate?: string | undefined;
    lot?: string | undefined;
    fichierRetenu?: string | undefined;
}>;
export type CreateSummaryEntryRequest = z.infer<typeof createSummaryEntryRequestSchema>;
export declare const updateSummaryEntryRequestSchema: z.ZodObject<{
    lot: z.ZodOptional<z.ZodString>;
    fichierRetenu: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    entryDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    amount?: number | undefined;
    entryDate?: string | undefined;
    lot?: string | undefined;
    fichierRetenu?: string | undefined;
}, {
    amount?: number | undefined;
    entryDate?: string | undefined;
    lot?: string | undefined;
    fichierRetenu?: string | undefined;
}>;
export type UpdateSummaryEntryRequest = z.infer<typeof updateSummaryEntryRequestSchema>;
export declare const importSummaryEntriesRequestSchema: z.ZodObject<{
    replace: z.ZodDefault<z.ZodBoolean>;
    entries: z.ZodArray<z.ZodObject<{
        lot: z.ZodDefault<z.ZodString>;
        fichierRetenu: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        amount: z.ZodNumber;
        entryDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        lot: string;
        fichierRetenu: string;
        entryDate?: string | undefined;
    }, {
        amount: number;
        entryDate?: string | undefined;
        lot?: string | undefined;
        fichierRetenu?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    entries: {
        amount: number;
        lot: string;
        fichierRetenu: string;
        entryDate?: string | undefined;
    }[];
    replace: boolean;
}, {
    entries: {
        amount: number;
        entryDate?: string | undefined;
        lot?: string | undefined;
        fichierRetenu?: string | undefined;
    }[];
    replace?: boolean | undefined;
}>;
export type ImportSummaryEntriesRequest = z.infer<typeof importSummaryEntriesRequestSchema>;
export interface ImportSummaryResponse {
    entries: SummaryEntryResponse[];
    totalAmount: number;
}
