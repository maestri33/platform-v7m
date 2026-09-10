"use client";

import * as React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export type Tab = {
  title: string;
  value: string;
  icon?: React.ReactNode;
  badge?: string;
  content?: string | React.ReactNode;
};

export interface TabsProps {
  tabs: Tab[];
  activeTab?: string;
  onChange?: (value: string) => void;
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
}

export const Tabs = ({
  tabs: propTabs,
  activeTab: controlledActiveTab,
  onChange,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}: TabsProps) => {
  const [internalActive, setInternalActive] = useState<string>(
    propTabs[0]?.value || ""
  );

  const activeValue = controlledActiveTab !== undefined ? controlledActiveTab : internalActive;
  const activeTabObj = propTabs.find((t) => t.value === activeValue) || propTabs[0];

  const handleSelect = (value: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActive(value);
    }
    onChange?.(value);
  };

  if (!propTabs || propTabs.length === 0) return null;

  return (
    <div className="flex w-full flex-col">
      {/* Tab Navigation List */}
      <div
        role="tablist"
        aria-label="Alternador de Ambientes"
        className={cn(
          "relative flex flex-row items-center justify-start gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/80 p-1.5 backdrop-blur-md no-scrollbar",
          containerClassName
        )}
      >
        {propTabs.map((tab) => {
          const isActive = activeValue === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleSelect(tab.value)}
              className={cn(
                "relative z-10 flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                isActive
                  ? "text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                tabClassName
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="aceternity-active-tab-indicator"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  className={cn(
                    "absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 shadow-md",
                    activeTabClassName
                  )}
                />
              )}
              {tab.icon && <span className="shrink-0 text-sm">{tab.icon}</span>}
              <span className="truncate">{tab.title}</span>
              {tab.badge && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Optional Tab Content View */}
      {activeTabObj?.content && (
        <div className={cn("relative mt-4 w-full", contentClassName)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTabObj.value}
              initial={{ opacity: 0, y: 8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full"
            >
              {activeTabObj.content}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
