'use client';

import { ReactNode } from "react";
import { NoAuthProvider } from "@/components/NoAuthProvider";

type NoAuthLayoutProps = {
  children: ReactNode;
};

export default function NoAuthLayout({ children }: NoAuthLayoutProps) {
  return (
    <NoAuthProvider>
      {children}
    </NoAuthProvider>
  );
}
