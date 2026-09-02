"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Actor = 'buyer' | 'merchant' | 'gateway';
export type Status = 'success' | 'blocked' | 'error' | 'retry';

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  actor: Actor;
  action: string;
  payload?: unknown;
  status: Status;
}

interface AuditContextValue {
  logs: AuditLogEntry[];
  addLog: (entry: Omit<AuditLogEntry, 'timestamp' | 'id'>) => void;
}

const AuditContext = createContext<AuditContextValue | undefined>(undefined);

export const AuditProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);

  const addLog = (entry: Omit<AuditLogEntry, 'timestamp' | 'id'>) => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    setLogs((prev) => [...prev, { ...entry, timestamp: Date.now(), id: uniqueId }]);
  };

  return (
    <AuditContext.Provider value={{ logs, addLog }}>
      {children}
    </AuditContext.Provider>
  );
};

export const useAudit = (): AuditContextValue => {
  const ctx = useContext(AuditContext);
  if (!ctx) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return ctx;
};
