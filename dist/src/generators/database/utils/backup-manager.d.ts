import { DatabaseGenerator } from '../index';
export interface BackupOptions {
    directory?: string;
    retention?: number;
    compression?: boolean;
    encryption?: {
        enabled: boolean;
        key?: string;
    };
    schedule?: {
        enabled: boolean;
        cron?: string;
    };
}
export interface BackupResult {
    success: boolean;
    filename: string;
    size: number;
    duration: number;
    timestamp: Date;
    error?: string;
}
export interface RestoreOptions {
    filename: string;
    overwrite?: boolean;
    targetDatabase?: string;
}
export declare class BackupManager {
    private generator;
    private options;
    constructor(generator: DatabaseGenerator, options?: BackupOptions);
    createBackup(): Promise<BackupResult>;
    private createPostgresBackup;
    private createMongoBackup;
    restoreBackup(options: RestoreOptions): Promise<BackupResult>;
    private createPostgresRestore;
    private createMongoRestore;
    listBackups(): Promise<{
        filename: string;
        size: number;
        created: Date;
        type: 'full' | 'schema' | 'data';
    }[]>;
    deleteBackup(filename: string): Promise<boolean>;
    cleanupOldBackups(): Promise<number>;
    generateBackupScheduleScript(): string;
    private generateBackupFilename;
    private ensureDirectoryExists;
    private fileExists;
    private directoryExists;
}
//# sourceMappingURL=backup-manager.d.ts.map