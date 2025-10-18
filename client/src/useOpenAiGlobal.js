import { useSyncExternalStore } from "react";

export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

export function useOpenAiGlobal(key) {
  const subscribe = (onChange) => {
    if (typeof window === "undefined") {
      return () => {};
    }

    const handleSetGlobal = (event) => {
      const value = event.detail?.globals?.[key];
      if (value === undefined) {
        return;
      }

      onChange();
    };

    window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
      passive: true,
    });

    return () => {
      window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
    };
  };

  const getSnapshot = () => {
    if (typeof window === "undefined") {
      return null;
    }

    return window.openai?.[key] ?? null;
  };

  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
