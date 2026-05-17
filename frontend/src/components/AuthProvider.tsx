"use client";

import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { supabase } from "@/supabaseClient";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
}
