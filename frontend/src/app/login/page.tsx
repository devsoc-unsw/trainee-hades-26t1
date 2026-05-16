"use client";

import Link from "next/link";
import { ChangeEvent, SubmitEvent, useState } from "react";

import { AuthPageShell } from "@/components/AuthPageShell";

const authFieldClassName =
  "h-10 sm:h-14 w-full rounded-md sm:rounded-lg bg-[#5F7B9340] px-4 sm:px-5 text-sm sm:text-sm outline-none placeholder:text-[#5f7b93]/70";

const authPrimaryButtonClassName =
  "h-10 sm:h-14 w-full rounded-md sm:rounded-lg bg-[var(--dark-blue)] text-sm sm:text-sm font-bold text-white transition-opacity hover:opacity-90";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) {
      // TODO: show error message
      console.error("Email and password are required");
      return;
    }

    try {
      const resp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!resp.ok) {
        // TODO: show error message
        console.error("Login failed");
        return;
      }
    } catch (error) {
      // TODO: show error message
      console.error("An error occurred during login", error);
    }
  };

  return (
    <AuthPageShell
      title="Sign In !!!"
      subtitle="Welcome back :D"
      imageSrc="/login-left.jpg"
      imageAlt="pixel room"
      footer={
        <p>
          Don’t have an account?{" "}
          <Link href="/register" className="font-bold underline">
            Register
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-4">
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

        <button
          type="button"
          className="text-left text-sm font-semibold text-[#627a94]"
        >
          Forgot Password?
        </button>

        <button type="submit" className={authPrimaryButtonClassName}>
          Sign in
        </button>
      </form>
    </AuthPageShell>
  );
}
