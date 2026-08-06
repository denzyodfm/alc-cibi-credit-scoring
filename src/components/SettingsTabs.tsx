"use client";

import { useState, type ReactNode } from "react";

type SettingsTab = {
  id: string;
  label: string;
  content: ReactNode;
};

export function SettingsTabs({ tabs }: { tabs: SettingsTab[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const selected = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  if (!selected) return null;

  return (
    <div>
      <div
        className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 pb-2"
        role="tablist"
        aria-label="Settings sections"
      >
        {tabs.map((tab) => {
          const active = tab.id === selected.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`settings-panel-${tab.id}`}
              id={`settings-tab-${tab.id}`}
              className={active ? "btn-primary shrink-0" : "btn-secondary shrink-0"}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        key={selected.id}
        id={`settings-panel-${selected.id}`}
        role="tabpanel"
        aria-labelledby={`settings-tab-${selected.id}`}
      >
        {selected.content}
      </div>
    </div>
  );
}
