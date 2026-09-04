"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Settings {
  apiKey: string;
  model: string;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ apiKey: "", model: "openai/gpt-oss-120b" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storedKey = localStorage.getItem("bit:apiKey");
    const storedModel = localStorage.getItem("bit:model");
    setSettings({
      apiKey: storedKey || "",
      model: storedModel || "openai/gpt-oss-120b",
    });
    setLoaded(true);
  }, []);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (updated.apiKey !== undefined) localStorage.setItem("bit:apiKey", updated.apiKey);
      if (updated.model !== undefined) localStorage.setItem("bit:model", updated.model);
      return updated;
    });
  };

  if (!loaded) return null; // Prevent hydration mismatch

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
