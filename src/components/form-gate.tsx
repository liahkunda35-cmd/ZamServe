"use client";

import { useRef, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";

type GateField = { id: string; message: string };

export function useFormGate(fields: GateField[]) {
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});

  function messageFor(id: string) {
    return fields.find((field) => field.id === id)?.message ?? "";
  }

  function focus(id: string) {
    window.setTimeout(() => refs.current[id]?.focus(), 0);
  }

  function earlier(id: string) {
    const index = fields.findIndex((field) => field.id === id);
    return fields.slice(0, Math.max(index, 0)).find((field) => field.message);
  }

  function reveal(id: string) {
    setShown((current) => ({ ...current, [id]: true }));
  }

  function hold(id: string) {
    const blocked = earlier(id);
    if (!blocked) return false;
    setShown((current) => ({ ...current, [blocked.id]: true }));
    focus(blocked.id);
    return true;
  }

  function onBlur(id: string) {
    return (event: FocusEvent<HTMLElement>) => {
      const next = event.relatedTarget as HTMLElement | null;
      if (next?.dataset.passwordToggle === "true" || next?.closest("[data-password-toggle]")) return;
      if (next?.closest("a") || next?.closest("[data-gate-back]")) {
        reveal(id);
        return;
      }
      reveal(id);
      if (!messageFor(id)) return;
      const nextId = next?.closest("[data-gate]")?.getAttribute("data-gate");
      const nextIndex = nextId ? fields.findIndex((field) => field.id === nextId) : -1;
      const currentIndex = fields.findIndex((field) => field.id === id);
      if (nextIndex >= 0 && nextIndex < currentIndex) return;
      focus(id);
    };
  }

  function input(id: string) {
    return {
      ref: (node: HTMLElement | null) => {
        refs.current[id] = node;
      },
      "data-gate": id,
      onBlur: onBlur(id),
      onMouseDown: (event: MouseEvent<HTMLElement>) => {
        if (hold(id)) event.preventDefault();
      },
    };
  }

  function blockSubmit() {
    const first = fields.find((field) => field.message);
    if (!first) return false;
    const next: Record<string, boolean> = {};
    for (const field of fields) if (field.message) next[field.id] = true;
    setShown((current) => ({ ...current, ...next }));
    focus(first.id);
    return true;
  }

  return {
    error: (id: string) => (shown[id] ? messageFor(id) : ""),
    input,
    hold,
    blockSubmit,
  };
}

export function Gate({ id, gate, children }: { id: string; gate: { hold: (id: string) => boolean }; children: ReactNode }) {
  return (
    <div
      data-gate={id}
      onMouseDownCapture={(event) => {
        if (gate.hold(id)) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
    </div>
  );
}
