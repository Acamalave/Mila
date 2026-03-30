"use client";

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from "react";

export type EventType =
  | "staff:created" | "staff:updated" | "staff:deleted"
  | "product:created" | "product:updated" | "product:deleted"
  | "invoice:created" | "invoice:updated" | "invoice:sent" | "invoice:paid" | "invoice:declined"
  | "notification:created" | "notification:read"
  | "payment:completed" | "payment:failed"
  | "booking:updated";

interface EventBusContextValue {
  emit: (event: EventType, payload?: unknown) => void;
  on: (event: EventType, handler: (payload?: unknown) => void) => () => void;
}

const EventBusContext = createContext<EventBusContextValue | null>(null);

export function EventBusProvider({ children }: { children: ReactNode }) {
  const targetRef = useRef<EventTarget>(new EventTarget());
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel("mila-events");
    } catch {
      // BroadcastChannel not supported
    }
    return () => {
      channelRef.current?.close();
    };
  }, []);

  const emit = useCallback((event: EventType, payload?: unknown) => {
    targetRef.current.dispatchEvent(
      new CustomEvent(event, { detail: payload })
    );
    try {
      channelRef.current?.postMessage({ event, payload });
    } catch {
      // ignore
    }
  }, []);

  const on = useCallback((event: EventType, handler: (payload?: unknown) => void) => {
    const localHandler = (e: Event) => handler((e as CustomEvent).detail);
    targetRef.current.addEventListener(event, localHandler);

    const channelHandler = (e: MessageEvent) => {
      if (e.data?.event === event) {
        handler(e.data.payload);
      }
    };
    channelRef.current?.addEventListener("message", channelHandler);

    return () => {
      targetRef.current.removeEventListener(event, localHandler);
      channelRef.current?.removeEventListener("message", channelHandler);
    };
  }, []);

  return (
    <EventBusContext.Provider value={{ emit, on }}>
      {children}
    </EventBusContext.Provider>
  );
}

export function useEventBus(): EventBusContextValue {
  const context = useContext(EventBusContext);
  if (!context) {
    throw new Error("useEventBus must be used within an EventBusProvider");
  }
  return context;
}
