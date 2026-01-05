export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username?: string;
  password?: string;
  maxPoolSize?: number;
  minPoolSize?: number;
  connectionTimeout?: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  connectionTime: Date | null;
  lastError: string | null;
  poolSize: number;
}

export class DatabaseConnection {
  private static instance: DatabaseConnection | null = null;
  private static readonly lock = Symbol('DatabaseConnectionLock');

  private _isConnected: boolean = false;
  private _connectionTime: Date | null = null;
  private _lastError: string | null = null;
  private _config: DatabaseConfig | null = null;
  private _poolSize: number = 0;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  static resetInstance(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.disconnect();
      DatabaseConnection.instance = null;
    }
  }

  async connect(config: DatabaseConfig): Promise<void> {
    if (this._isConnected) {
      console.log('[DatabaseConnection] Already connected to database');
      return;
    }

    this._config = config;

    try {
      console.log(
        `[DatabaseConnection] Connecting to ${config.host}:${config.port}/${config.database}...`
      );

      await this.simulateConnection(config);

      this._isConnected = true;
      this._connectionTime = new Date();
      this._poolSize = config.maxPoolSize ?? 10;
      this._lastError = null;

      console.log('[DatabaseConnection] Successfully connected to database');
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : 'Unknown error';
      this._isConnected = false;
      throw new Error(`Failed to connect to database: ${this._lastError}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this._isConnected) {
      console.log('[DatabaseConnection] Not connected to database');
      return;
    }

    try {
      console.log('[DatabaseConnection] Disconnecting from database...');

      await this.simulateDisconnection();

      this._isConnected = false;
      this._connectionTime = null;
      this._poolSize = 0;

      console.log('[DatabaseConnection] Successfully disconnected from database');
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to disconnect from database: ${this._lastError}`);
    }
  }

  getStatus(): ConnectionStatus {
    return {
      isConnected: this._isConnected,
      connectionTime: this._connectionTime,
      lastError: this._lastError,
      poolSize: this._poolSize,
    };
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  getConfig(): DatabaseConfig | null {
    return this._config ? { ...this._config } : null;
  }

  ensureConnected(): void {
    if (!this._isConnected) {
      throw new Error('Database is not connected. Call connect() first.');
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this._isConnected) {
      return false;
    }

    try {
      await this.simulatePing();
      return true;
    } catch {
      return false;
    }
  }

  private async simulateConnection(config: DatabaseConfig): Promise<void> {
    const timeout = config.connectionTimeout ?? 5000;
    await new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (config.host && config.database) {
          resolve();
        } else {
          reject(new Error('Invalid configuration'));
        }
      }, 100);
    });
  }

  private async simulateDisconnection(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }

  private async simulatePing(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
}
