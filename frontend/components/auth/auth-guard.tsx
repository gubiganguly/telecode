"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const hasRedirected = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isPublic && !isAuthenticated() && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/login");
    }
  }, [pathname, isPublic, router, mounted]);

  // Server render and pre-mount: always render children to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  if (isPublic || isAuthenticated()) {
    return <>{children}</>;
  }

  return null;
}
