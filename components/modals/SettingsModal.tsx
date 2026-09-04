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
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-rzp-navy">
            System Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Groq API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rzp-blue focus:ring-1 focus:ring-rzp-blue shadow-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Leave blank to use the server's default .env key.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              LLM Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 focus:outline-none focus:border-rzp-blue focus:ring-1 focus:ring-rzp-blue shadow-sm appearance-none"
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
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg bg-rzp-blue text-xs font-medium text-white hover:bg-rzp-blue-dark transition shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
