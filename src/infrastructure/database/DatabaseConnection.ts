import { Pool, PoolConfig, QueryResult, QueryResultRow } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user?: string;
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
  private _pool: Pool | null = null;
  private _isConnected: boolean = false;
  private _connectionTime: Date | null = null;
  private _lastError: string | null = null;
  private _config: DatabaseConfig | null = null;

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
        `[DatabaseConnection] Connecting to PostgreSQL ${config.host}:${config.port}/${config.database}...`
      );

      const poolConfig: PoolConfig = {
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        max: config.maxPoolSize ?? 10,
        min: config.minPoolSize ?? 2,
        connectionTimeoutMillis: config.connectionTimeout ?? 5000,
        idleTimeoutMillis: 30000,
      };

      this._pool = new Pool(poolConfig);

      await this._pool.query('SELECT 1');

      this._isConnected = true;
      this._connectionTime = new Date();
      this._lastError = null;

      console.log('[DatabaseConnection] Successfully connected to PostgreSQL');
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : 'Unknown error';
      this._isConnected = false;
      throw new Error(`Failed to connect to database: ${this._lastError}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this._isConnected || !this._pool) {
      console.log('[DatabaseConnection] Not connected to database');
      return;
    }

    try {
      console.log('[DatabaseConnection] Disconnecting from database...');

      await this._pool.end();

      this._pool = null;
      this._isConnected = false;
      this._connectionTime = null;

      console.log('[DatabaseConnection] Successfully disconnected from database');
    } catch (error) {
      this._lastError = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to disconnect from database: ${this._lastError}`);
    }
  }

  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    this.ensureConnected();
    return this._pool!.query<T>(text, params);
  }

  getPool(): Pool {
    this.ensureConnected();
    return this._pool!;
  }

  getStatus(): ConnectionStatus {
    return {
      isConnected: this._isConnected,
      connectionTime: this._connectionTime,
      lastError: this._lastError,
      poolSize: this._pool?.totalCount ?? 0,
    };
  }

  isConnected(): boolean {
    return this._isConnected;
  }

  getConfig(): DatabaseConfig | null {
    return this._config ? { ...this._config } : null;
  }

  ensureConnected(): void {
    if (!this._isConnected || !this._pool) {
      throw new Error('Database is not connected. Call connect() first.');
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this._isConnected || !this._pool) {
      return false;
    }

    try {
      await this._pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
