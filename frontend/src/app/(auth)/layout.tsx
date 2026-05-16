import { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";

type AuthLayoutProps = {
  children: ReactNode;
};

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
