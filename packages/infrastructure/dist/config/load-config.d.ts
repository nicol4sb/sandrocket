export type AuthProvider = 'firebase' | 'firebase-emulator' | 'mock';
export interface FirebaseWebConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId: string;
    measurementId?: string;
}
export interface AppConfig {
    env: 'development' | 'test' | 'production';
    server: {
        host: string;
        port: number;
        baseUrl: string;
        corsAllowList: string[];
    };
    database: {
        filename: string;
    };
    auth: {
        provider: AuthProvider;
        useEmulator: boolean;
        firebase?: FirebaseWebConfig;
        adminCredentialsPath?: string;
    };
    security: {
        jwtSecret: string;
        sessionCookieName: string;
        sessionCookieSecure: boolean;
    };
    frontend: {
        origin?: string;
    };
}
export interface LoadConfigOptions {
    /**
     * Ordered list of env files to evaluate. Later entries override earlier ones.
     * Defaults to ['.env', '.env.local'].
     */
    envFilePaths?: string[];
    /**
     * Provide explicit overrides for process.env values.
     */
    overrides?: Record<string, string | undefined>;
}
export declare function loadConfig(options?: LoadConfigOptions): AppConfig;
