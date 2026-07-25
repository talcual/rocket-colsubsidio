declare module 'node:sqlite' {
  export interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  export interface StatementSync {
    run(...bindParameters: unknown[]): RunResult;
    get(...bindParameters: unknown[]): Record<string, unknown> | undefined;
    all(...bindParameters: unknown[]): Record<string, unknown>[];
    setReadBigInts(enabled: boolean): void;
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
    enableForeignKeyConstraints?: boolean;
    enableLoadExtension?: boolean;
  }

  export class DatabaseSync {
    constructor(location: string, options?: DatabaseSyncOptions);
    open(): void;
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    transaction<T extends (...args: unknown[]) => unknown>(fn: T): T;
  }
}
