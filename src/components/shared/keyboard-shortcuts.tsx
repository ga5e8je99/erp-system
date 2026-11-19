"use client";

import * as React from "react";

export function KeyboardShortcuts() {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an editable field
      const activeEl = document.activeElement as HTMLElement | null;
      const isInput =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.tagName === "SELECT" ||
        activeEl?.isContentEditable;

      if (isInput) return;

      // Shortcut: "/" -> Focus primary search input
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[name="q"], input[name="search"], input[placeholder*="بحث"], input[placeholder*="Search"], input[placeholder*="تصفية"]'
        );

        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Shortcut: "N" or "n" -> Click primary "New / Add" button on list pages
      if ((e.key === "n" || e.key === "N") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Priority 1: Explicit data attribute
        let newBtn = document.querySelector<HTMLElement>("[data-hotkey-new]");

        // Priority 2: Button or link containing Plus icon
        if (!newBtn) {
          newBtn = document.querySelector<HTMLElement>(
            'button:has(svg.lucide-plus), a:has(svg.lucide-plus)'
          );
        }

        // Priority 3: Common 'new' link
        if (!newBtn) {
          newBtn = document.querySelector<HTMLElement>('a[href$="/new"]');
        }

        if (newBtn && !newBtn.hasAttribute("disabled") && !newBtn.getAttribute("aria-disabled")) {
          e.preventDefault();
          newBtn.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
