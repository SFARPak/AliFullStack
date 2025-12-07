import React, { createContext, useContext, useEffect, useState } from "react";
import { IpcClient, DeepLinkData } from "../ipc/ipc_client";

type DeepLinkContextType = {
  lastDeepLink: (DeepLinkData & { timestamp: number }) | null;
};

const DeepLinkContext = createContext<DeepLinkContextType>({
  lastDeepLink: null,
});

export function DeepLinkProvider({ children }: { children: React.ReactNode }) {
  console.log("DeepLinkProvider rendering");
  const [lastDeepLink, setLastDeepLink] = useState<
    (DeepLinkData & { timestamp: number }) | null
  >(null);

  useEffect(() => {
    if (!(window as any).electron) {
      console.warn("DeepLinkProvider: window.electron not available, skipping deep link setup");
      return;
    }
    console.log("DeepLinkProvider useEffect starting");
    try {
      const ipcClient = IpcClient.getInstance();
      console.log("IPC client instance obtained");
      const unsubscribe = ipcClient.onDeepLinkReceived((data) => {
        console.log("Deep link received:", data);
        // Update with timestamp to ensure state change even if same type comes twice
        setLastDeepLink({ ...data, timestamp: Date.now() });
      });
      console.log("DeepLinkProvider useEffect completed");
      return unsubscribe;
    } catch (error) {
      console.error("Error in DeepLinkProvider useEffect:", error);
      return () => {};
    }
  }, []);

  return (
    <DeepLinkContext.Provider value={{ lastDeepLink }}>
      {children}
    </DeepLinkContext.Provider>
  );
}

export const useDeepLink = () => useContext(DeepLinkContext);
