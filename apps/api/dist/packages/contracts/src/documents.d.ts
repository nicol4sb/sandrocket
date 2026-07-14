import { z } from 'zod';
export declare const documentResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    projectId: z.ZodNumber;
    originalFilename: z.ZodString;
    mimeType: z.ZodString;
    sizeBytes: z.ZodNumber;
    uploaderUserId: z.ZodNumber;
    uploaderDisplayName: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: number;
    projectId: number;
    createdAt: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    uploaderUserId: number;
    uploaderDisplayName: string;
}, {
    id: number;
    projectId: number;
    createdAt: string;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    uploaderUserId: number;
    uploaderDisplayName: string;
}>;
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export declare const documentActivityResponseSchema: z.ZodObject<{
    id: z.ZodNumber;
    action: z.ZodEnum<["uploaded", "downloaded", "deleted", "viewed"]>;
    filename: z.ZodString;
    userDisplayName: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    action: "uploaded" | "downloaded" | "deleted" | "viewed";
    id: number;
    createdAt: string;
    filename: string;
    userDisplayName: string;
}, {
    action: "uploaded" | "downloaded" | "deleted" | "viewed";
    id: number;
    createdAt: string;
    filename: string;
    userDisplayName: string;
}>;
export type DocumentActivityResponse = z.infer<typeof documentActivityResponseSchema>;
export interface ListDocumentsResponse {
    documents: DocumentResponse[];
    activity: DocumentActivityResponse[];
    totalSizeBytes: number;
    maxSizeBytes: number;
}
