"use client";

import { useState, type ReactNode, createContext, useContext } from "react";

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

interface TabsProps {
  defaultTab: string;
  children: ReactNode;
  className?: string;
}

export default function Tabs({ defaultTab, children, className = "" }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: ReactNode;
  className?: string;
}

Tabs.List = function TabList({ children, className = "" }: TabListProps) {
  return (
    <div
      className={`flex border-b border-gray-200 gap-1 ${className}`}
      role="tablist"
    >
      {children}
    </div>
  );
};

interface TabTriggerProps {
  id: string;
  children: ReactNode;
  className?: string;
}

Tabs.Trigger = function TabTrigger({ id, children, className = "" }: TabTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === id;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer
        border-b-2 -mb-px whitespace-nowrap
        ${isActive
          ? "border-[#2563eb] text-[#2563eb]"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}
        ${className}`}
    >
      {children}
    </button>
  );
};

interface TabPanelProps {
  id: string;
  children: ReactNode;
  className?: string;
}

Tabs.Panel = function TabPanel({ id, children, className = "" }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== id) return null;
  return (
    <div role="tabpanel" className={`pt-4 ${className}`}>
      {children}
    </div>
  );
};
