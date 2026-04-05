"use client";
import Link from "next/link";
import { useState } from "react";

export default function Navbar() {
  const [activePath, setActivePath] = useState("/");

  const linkStyles = "px-4 py-2 rounded-full transition-colors duration-200";
  const activeStyles = "bg-(--dark-blue) text-white hover:text-white/70";
  const inactiveStyles = "hover:text-(--dark-blue)/60";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-(--pastel-yellow) text-(--dark-blue) border-b-2 border-(--dark-blue) h-16 flex items-center px-6 justify-between">
      <span className="font-(family-name:--font-pixelify) font-bold text-2xl transition-transform duration-300 hover:scale-105">
        StudyNook.
      </span>
      <div className="flex gap-6 text-l">
        <Link
          href="/"
          className={`${linkStyles} ${
            activePath == "/" ? activeStyles : inactiveStyles
          }`}
        >
          Home
        </Link>
        <Link
          href="/rooms"
          className={`${linkStyles} ${
            activePath == "/rooms" ? activeStyles : inactiveStyles
          }`}
          onClick={() => setActivePath("/rooms")}
        >
          Rooms
        </Link>
        <Link
          href="/profile"
          className={`${linkStyles} ${
            activePath == "/profile" ? activeStyles : inactiveStyles
          }`}
          onClick={() => setActivePath("/profile")}
        >
          Profile
        </Link>
      </div>
    </nav>
  );
}
