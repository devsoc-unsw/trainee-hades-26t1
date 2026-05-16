"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";

import { AuthPageShell } from "@/components/AuthPageShell";

const authFieldClassName =
  "h-12 sm:h-16 w-full rounded-md sm:rounded-lg bg-[#5F7B9340] px-4 sm:px-5 text-sm sm:text-sm outline-none placeholder:text-[#5f7b93]/70";

const authPrimaryButtonClassName =
  "h-12 sm:h-16 w-full rounded-md sm:rounded-lg bg-[var(--dark-blue)] text-sm sm:text-sm font-bold text-white transition-opacity hover:opacity-90";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [school, setSchool] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      <form onSubmit={handleSubmit} className="space-y-4">
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

