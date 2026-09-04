"use client";
import React, { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);

  useEffect(() => {
    if (isOpen) {
      setApiKey(settings.apiKey);
      setModel(settings.model);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings({ apiKey, model });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            System Settings
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Groq API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-bitPrimary"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Leave blank to use the server's default .env key.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              LLM Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded border border-slate-700 bg-slate-900/50 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-bitPrimary appearance-none"
            >
              <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile</option>
              <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
              <option value="llama3-70b-8192">llama3-70b-8192</option>
              <option value="llama3-8b-8192">llama3-8b-8192</option>
              <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
              <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Demo)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-bitPrimary text-xs font-medium text-slate-900 hover:bg-bitPrimary/80 transition shadow-lg shadow-bitPrimary/20"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
