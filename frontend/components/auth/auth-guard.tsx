"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!isPublic && !isAuthenticated() && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/login");
    }
  }, [pathname, isPublic, router]);

  if (isPublic || isAuthenticated()) {
    return <>{children}</>;
  }

  return null;
}
