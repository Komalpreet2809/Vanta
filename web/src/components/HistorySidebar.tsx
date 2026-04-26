"use client";

import { History, X, Play, Clock, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type HistoryItem = {
  id: string;
  timestamp: number;
  filename: string;
  result: {
    extracted: Blob;
    residue: Blob;
    meta: {
      outputSeconds: number;
      sampleRate: number;
    };
  };
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
};

export function HistorySidebar({ isOpen, onClose, items, onSelect, onDelete }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-50 h-full w-[320px] border-l border-[var(--border)] bg-[var(--bg-main)] shadow-2xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-[var(--accent)]" />
                  <h2 className="text-[16px] font-bold text-[var(--text)] uppercase tracking-wider">
                    History
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-[var(--text-dim)] hover:bg-[var(--bg-input)] hover:text-[var(--text)] transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto px-4 py-6">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <Clock className="h-10 w-10 text-[var(--border)]" />
                    <p className="text-[13px] text-[var(--text-dim)] px-10">
                      Your recent extractions will appear here for quick access.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="group relative rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all hover:border-[var(--accent)]/50 hover:shadow-md"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between">
                            <span className="truncate pr-4 text-[13px] font-medium text-[var(--text)]">
                              {item.filename}
                            </span>
                            <button
                              onClick={() => onDelete(item.id)}
                              className="text-[var(--text-dim)] hover:text-[var(--err)] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-[var(--text-dim)]">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] text-[var(--text-dim)] opacity-30">|</span>
                              <span className="text-[11px] text-[var(--accent)]">
                                {item.result.meta.outputSeconds.toFixed(1)}s
                              </span>
                            </div>
                            
                            <button
                              onClick={() => onSelect(item)}
                              className="flex items-center gap-1.5 rounded-md bg-[var(--accent)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg-main)] transition-all"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              RESTORE
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[var(--border)] p-6">
                <div className="rounded-lg bg-[var(--bg-input)] p-3 text-center">
                  <span className="text-[11px] font-mono text-[var(--text-dim)] uppercase tracking-tighter">
                    History is stored locally in-session
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
