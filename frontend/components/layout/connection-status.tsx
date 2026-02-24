"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { wsManager, type ConnectionStatus as WsStatus } from "@/lib/websocket";
import { isAuthenticated } from "@/lib/auth";

export function ConnectionStatus() {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStatus(wsManager.getStatus());
    return wsManager.onStatusChange(setStatus);
  }, []);

  const show =
    mounted &&
    isAuthenticated() &&
    (status === "reconnecting" || status === "disconnected");

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 bg-error/90 text-white text-sm py-2 px-4"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <WifiOff size={14} />
          <span>
            {status === "reconnecting"
              ? "Reconnecting to server..."
              : "Disconnected from server"}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
