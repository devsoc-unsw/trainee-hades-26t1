"use client";

import { useRouter } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import { supabase } from "@/supabaseClient";

type NoAuthProviderProps = {
  children: ReactNode;
};

export function NoAuthProvider({ children }: NoAuthProviderProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push("/rooms");
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show nothing while checking auth
  if (isChecking) {
    return null;
  }

  return <>{children}</>;
}
