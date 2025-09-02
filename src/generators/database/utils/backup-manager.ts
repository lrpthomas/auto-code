import { DatabaseGenerator } from '../index';
import { PostgreSQLGenerator } from '../postgresql';
import { MongoDBGenerator } from '../mongodb';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupOptions {
  directory?: string;
  retention?: number; // days
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

export class BackupManager {
  private generator: DatabaseGenerator;
  private options: BackupOptions;

  constructor(generator: DatabaseGenerator, options: BackupOptions = {}) {
    this.generator = generator;
    this.options = {
      directory: './backups',
      retention: 30,
      compression: true,
      encryption: { enabled: false },
      schedule: { enabled: false },
      ...options
    };
  }

  async createBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const filename = this.generateBackupFilename(timestamp);
    const filepath = path.join(this.options.directory!, filename);
    
    try {
      // Ensure backup directory exists
      await this.ensureDirectoryExists(this.options.directory!);
      
      let backupScript: string;
      
      if (this.generator instanceof PostgreSQLGenerator) {
        backupScript = await this.createPostgresBackup(filepath);
      } else if (this.generator instanceof MongoDBGenerator) {
        backupScript = await this.createMongoBackup(filepath);
      } else {
        throw new Error('Unsupported database generator type');
      }
      
      // Write backup script
      await fs.promises.writeFile(`${filepath}.sh`, backupScript, { mode: 0o755 });
      
      // Execute backup (in real implementation)
      // await this.executeBackupScript(`${filepath}.sh`);
      
      const stats = await fs.promises.stat(`${filepath}.sh`);
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        filename,
        size: stats.size,
        duration,
        timestamp
      };
    } catch (error) {
      return {
        success: false,
        filename,
        size: 0,
        duration: Date.now() - startTime,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createPostgresBackup(filepath: string): Promise<string> {
    const dbName = this.generator['config'].name;
    const compressionFlag = this.options.compression ? '--compress=9' : '';
    
    let script = `#!/bin/bash
# PostgreSQL Backup Script
# Generated: ${new Date().toISOString()}

set -e

DB_NAME="${dbName}"
BACKUP_FILE="${filepath}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "Starting backup of database: $DB_NAME"

# Create backup with custom format
pg_dump \\
  --host=\${PGHOST:-localhost} \\
  --port=\${PGPORT:-5432} \\
  --username=\${PGUSER:-postgres} \\
  --dbname=$DB_NAME \\
  --format=custom \\
  ${compressionFlag} \\
  --verbose \\
  --file="$BACKUP_FILE.backup"

# Create schema-only backup
pg_dump \\
  --host=\${PGHOST:-localhost} \\
  --port=\${PGPORT:-5432} \\
  --username=\${PGUSER:-postgres} \\
  --dbname=$DB_NAME \\
  --schema-only \\
  --file="$BACKUP_FILE.schema.sql"

# Create data-only backup
pg_dump \\
  --host=\${PGHOST:-localhost} \\
  --port=\${PGPORT:-5432} \\
  --username=\${PGUSER:-postgres} \\
  --dbname=$DB_NAME \\
  --data-only \\
  --file="$BACKUP_FILE.data.sql"
`;

    if (this.options.encryption?.enabled) {
      script += `
# Encrypt backup files
if command -v gpg &> /dev/null; then
  echo "Encrypting backup files..."
  gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE.backup"
  gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE.schema.sql"
  gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE.data.sql"
  
  # Remove unencrypted files
  rm "$BACKUP_FILE.backup"
  rm "$BACKUP_FILE.schema.sql"
  rm "$BACKUP_FILE.data.sql"
fi
`;
    }

    script += `
# Calculate backup size
BACKUP_SIZE=$(du -sh "${filepath}"* | cut -f1)
echo "Backup completed successfully"
echo "Backup size: $BACKUP_SIZE"
echo "Files created:"
ls -la "${filepath}"*

# Cleanup old backups
if [ "${this.options.retention}" -gt 0 ]; then
  echo "Cleaning up backups older than ${this.options.retention} days..."
  find "${this.options.directory}" -name "*.backup*" -mtime +${this.options.retention} -delete
  find "${this.options.directory}" -name "*.sql*" -mtime +${this.options.retention} -delete
fi
`;

    return script;
  }

  private async createMongoBackup(filepath: string): Promise<string> {
    const dbName = this.generator['config'].name;
    
    let script = `#!/bin/bash
# MongoDB Backup Script
# Generated: ${new Date().toISOString()}

set -e

DB_NAME="${dbName}"
BACKUP_DIR="${filepath}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "Starting backup of database: $DB_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# MongoDB dump
mongodump \\
  --host=\${MONGO_HOST:-localhost:27017} \\
  --db=$DB_NAME \\
  --out="$BACKUP_DIR"
`;

    if (this.options.compression) {
      script += `
# Compress backup
echo "Compressing backup..."
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR"
`;
    }

    if (this.options.encryption?.enabled) {
      script += `
# Encrypt backup
if command -v gpg &> /dev/null; then
  echo "Encrypting backup..."
  gpg --symmetric --cipher-algo AES256 "$BACKUP_DIR.tar.gz"
  rm "$BACKUP_DIR.tar.gz"
fi
`;
    }

    script += `
# Calculate backup size
BACKUP_SIZE=$(du -sh "${filepath}"* | cut -f1)
echo "Backup completed successfully"
echo "Backup size: $BACKUP_SIZE"

# Cleanup old backups
if [ "${this.options.retention}" -gt 0 ]; then
  echo "Cleaning up backups older than ${this.options.retention} days..."
  find "${this.options.directory}" -name "*${dbName}*" -mtime +${this.options.retention} -delete
fi
`;

    return script;
  }

  async restoreBackup(options: RestoreOptions): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    
    try {
      const filepath = path.join(this.options.directory!, options.filename);
      
      if (!await this.fileExists(filepath)) {
        throw new Error(`Backup file not found: ${options.filename}`);
      }
      
      let restoreScript: string;
      
      if (this.generator instanceof PostgreSQLGenerator) {
        restoreScript = await this.createPostgresRestore(filepath, options);
      } else if (this.generator instanceof MongoDBGenerator) {
        restoreScript = await this.createMongoRestore(filepath, options);
      } else {
        throw new Error('Unsupported database generator type');
      }
      
      // Write restore script
      const restoreScriptPath = `${filepath}.restore.sh`;
      await fs.promises.writeFile(restoreScriptPath, restoreScript, { mode: 0o755 });
      
      // Execute restore script (in real implementation)
      // await this.executeRestoreScript(restoreScriptPath);
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        filename: options.filename,
        size: 0,
        duration,
        timestamp
      };
    } catch (error) {
      return {
        success: false,
        filename: options.filename,
        size: 0,
        duration: Date.now() - startTime,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async createPostgresRestore(filepath: string, options: RestoreOptions): Promise<string> {
    const dbName = options.targetDatabase || this.generator['config'].name;
    
    return `#!/bin/bash
# PostgreSQL Restore Script
# Generated: ${new Date().toISOString()}

set -e

DB_NAME="${dbName}"
BACKUP_FILE="${filepath}.backup"
SCHEMA_FILE="${filepath}.schema.sql"
DATA_FILE="${filepath}.data.sql"

echo "Starting restore to database: $DB_NAME"

# Check if backup files exist
if [[ ! -f "$BACKUP_FILE" && ! -f "$SCHEMA_FILE" ]]; then
  echo "Error: No backup files found"
  exit 1
fi

# Drop and recreate database if overwrite is enabled
if [ "${options.overwrite ? 'true' : 'false'}" = "true" ]; then
  echo "Dropping existing database..."
  dropdb --if-exists \\
    --host=\${PGHOST:-localhost} \\
    --port=\${PGPORT:-5432} \\
    --username=\${PGUSER:-postgres} \\
    $DB_NAME
  
  echo "Creating new database..."
  createdb \\
    --host=\${PGHOST:-localhost} \\
    --port=\${PGPORT:-5432} \\
    --username=\${PGUSER:-postgres} \\
    $DB_NAME
fi

# Restore from custom format backup
if [ -f "$BACKUP_FILE" ]; then
  echo "Restoring from custom backup..."
  pg_restore \\
    --host=\${PGHOST:-localhost} \\
    --port=\${PGPORT:-5432} \\
    --username=\${PGUSER:-postgres} \\
    --dbname=$DB_NAME \\
    --verbose \\
    --clean \\
    --if-exists \\
    "$BACKUP_FILE"
fi

# Restore from SQL files
if [ -f "$SCHEMA_FILE" ]; then
  echo "Restoring schema..."
  psql \\
    --host=\${PGHOST:-localhost} \\
    --port=\${PGPORT:-5432} \\
    --username=\${PGUSER:-postgres} \\
    --dbname=$DB_NAME \\
    --file="$SCHEMA_FILE"
fi

if [ -f "$DATA_FILE" ]; then
  echo "Restoring data..."
  psql \\
    --host=\${PGHOST:-localhost} \\
    --port=\${PGPORT:-5432} \\
    --username=\${PGUSER:-postgres} \\
    --dbname=$DB_NAME \\
    --file="$DATA_FILE"
fi

echo "Restore completed successfully"
`;
  }

  private async createMongoRestore(filepath: string, options: RestoreOptions): Promise<string> {
    const dbName = options.targetDatabase || this.generator['config'].name;
    
    return `#!/bin/bash
# MongoDB Restore Script
# Generated: ${new Date().toISOString()}

set -e

DB_NAME="${dbName}"
BACKUP_PATH="${filepath}"

echo "Starting restore to database: $DB_NAME"

# Check if backup exists
if [[ ! -d "$BACKUP_PATH" && ! -f "$BACKUP_PATH.tar.gz" ]]; then
  echo "Error: Backup not found"
  exit 1
fi

# Extract compressed backup if needed
if [ -f "$BACKUP_PATH.tar.gz" ]; then
  echo "Extracting backup..."
  tar -xzf "$BACKUP_PATH.tar.gz" -C "$(dirname "$BACKUP_PATH")"
fi

# Drop existing database if overwrite is enabled
if [ "${options.overwrite ? 'true' : 'false'}" = "true" ]; then
  echo "Dropping existing database..."
  mongo $DB_NAME --eval "db.dropDatabase()"
fi

# Restore database
echo "Restoring database..."
mongorestore \\
  --host=\${MONGO_HOST:-localhost:27017} \\
  --db=$DB_NAME \\
  --dir="$BACKUP_PATH/$DB_NAME"

echo "Restore completed successfully"
`;
  }

  async listBackups(): Promise<{
    filename: string;
    size: number;
    created: Date;
    type: 'full' | 'schema' | 'data';
  }[]> {
    const backups: any[] = [];
    
    try {
      if (!await this.directoryExists(this.options.directory!)) {
        return backups;
      }
      
      const files = await fs.promises.readdir(this.options.directory!);
      
      for (const file of files) {
        const filepath = path.join(this.options.directory!, file);
        const stats = await fs.promises.stat(filepath);
        
        if (stats.isFile()) {
          let type: 'full' | 'schema' | 'data' = 'full';
          
          if (file.includes('.schema.')) {
            type = 'schema';
          } else if (file.includes('.data.')) {
            type = 'data';
          }
          
          backups.push({
            filename: file,
            size: stats.size,
            created: stats.mtime,
            type
          });
        }
      }
      
      // Sort by creation date, newest first
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());
      
    } catch (error) {
      console.error('Error listing backups:', error);
    }
    
    return backups;
  }

  async deleteBackup(filename: string): Promise<boolean> {
    try {
      const filepath = path.join(this.options.directory!, filename);
      await fs.promises.unlink(filepath);
      return true;
    } catch (error) {
      console.error('Error deleting backup:', error);
      return false;
    }
  }

  async cleanupOldBackups(): Promise<number> {
    let deletedCount = 0;
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.options.retention!);
      
      const backups = await this.listBackups();
      
      for (const backup of backups) {
        if (backup.created < cutoffDate) {
          if (await this.deleteBackup(backup.filename)) {
            deletedCount++;
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up backups:', error);
    }
    
    return deletedCount;
  }

  generateBackupScheduleScript(): string {
    const cronExpression = this.options.schedule?.cron || '0 2 * * *'; // Daily at 2 AM
    
    return `#!/bin/bash
# Backup Schedule Script
# Add to crontab: ${cronExpression} /path/to/backup-schedule.sh

# Set environment variables
export PATH="/usr/local/bin:/usr/bin:/bin"
export PGPASSWORD="$DB_PASSWORD"

# Run backup
cd "$(dirname "$0")"
node -e "
const { BackupManager } = require('./backup-manager');
const { ${this.generator instanceof PostgreSQLGenerator ? 'PostgreSQLGenerator' : 'MongoDBGenerator'} } = require('../${this.generator instanceof PostgreSQLGenerator ? 'postgresql' : 'mongodb'}');

const generator = new ${this.generator instanceof PostgreSQLGenerator ? 'PostgreSQLGenerator' : 'MongoDBGenerator'}({ name: '${this.generator['config'].name}' });
const backupManager = new BackupManager(generator, ${JSON.stringify(this.options)});

backupManager.createBackup().then(result => {
  if (result.success) {
    console.log(\`Backup completed: \${result.filename}\`);
  } else {
    console.error(\`Backup failed: \${result.error}\`);
    process.exit(1);
  }
}).catch(error => {
  console.error('Backup script error:', error);
  process.exit(1);
});
"
`;
  }

  private generateBackupFilename(timestamp: Date): string {
    const dateStr = timestamp.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeStr = timestamp.toISOString().split('T')[1].replace(/[:.]/g, '-').split('.')[0];
    return `${this.generator['config'].name}_${dateStr}_${timeStr}`;
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.promises.access(dir);
    } catch {
      await fs.promises.mkdir(dir, { recursive: true });
    }
  }

  private async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.promises.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stats = await fs.promises.stat(dir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}