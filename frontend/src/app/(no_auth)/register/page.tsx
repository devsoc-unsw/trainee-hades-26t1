"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { FeedbackModal } from "@/components/FeedbackModal";
import { AuthPageShell } from "@/components/AuthPageShell";
import { supabase } from "@/supabaseClient";

const authFieldClassName =
  "h-10 sm:h-14 w-full rounded-md sm:rounded-lg bg-[#5F7B9340] px-4 sm:px-5 text-sm sm:text-sm outline-none placeholder:text-[#5f7b93]/70";

const authPrimaryButtonClassName =
  "h-10 sm:h-14 w-full rounded-md sm:rounded-lg bg-[var(--dark-blue)] text-sm sm:text-sm font-bold text-white transition-opacity hover:opacity-90";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionLabel: string;
    variant: "success" | "error";
  } | null>(null);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name || !email || !password) {
      setFeedback({
        open: true,
        title: "Missing details",
        description: "Name, email, and password are required to register.",
        actionLabel: "Close",
        variant: "error",
      });
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

    if (!backendUrl) {
      setFeedback({
        open: true,
        title: "Configuration error",
        description: "The backend URL is not configured in the frontend app.",
        actionLabel: "Close",
        variant: "error",
      });
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        setFeedback({
          open: true,
          title: "Registration failed",
          description:
            "We couldn't create your account. Please check your details and try again.",
          actionLabel: "Try again",
          variant: "error",
        });
        return;
      }

      const data = await response.json();
      const { session } = data;

      if (!session || !session.access_token) {
        setFeedback({
          open: true,
          title: "Session error",
          description: "Failed to establish a session. Please try again.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      // Set the session in Supabase client
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      setFeedback({
        open: true,
        title: "Account created",
        description: "Your account was created successfully. Redirecting...",
        actionLabel: "Continue",
        variant: "success",
      });

      // Redirect to home after a short delay
      setTimeout(() => {
        router.push("/home");
      }, 1000);
    } catch {
      setFeedback({
        open: true,
        title: "Network error",
        description: "We couldn't reach the server. Please try again.",
        actionLabel: "Close",
        variant: "error",
      });
    }
  };

  return (
    <AuthPageShell
      title="Register"
      subtitle="Welcome to the club :)"
      imageSrc="/9a1762f5a9668b3a87bb6b6f828eb28a8e10882c.jpg"
      imageAlt="pixel room"
      footer={
        <p>
          Have an account?{" "}
          <Link href="/login" className="font-bold underline">
            Log in here
          </Link>
        </p>
      }
    >
      <FeedbackModal
        open={feedback?.open ?? false}
        onOpenChange={(open) => {
          if (!open) {
            setFeedback(null);
          }
        }}
        title={feedback?.title ?? ""}
        description={feedback?.description ?? ""}
        actionLabel={feedback?.actionLabel ?? "Close"}
        variant={feedback?.variant ?? "success"}
      />

      <form onSubmit={handleRegister} className="space-y-4">
        <input
          type="name"
          placeholder="Name"
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setName(e.target.value)
          }
          className={authFieldClassName}
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setEmail(e.target.value)
          }
          className={authFieldClassName}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setPassword(e.target.value)
          }
          className={authFieldClassName}
          required
        />
        <button type="submit" className={authPrimaryButtonClassName}>
          Create Account
        </button>
      </form>
    </AuthPageShell>
  );
}

