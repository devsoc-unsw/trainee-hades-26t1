"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  // Helper function -> determines if link is active
  const isActive = (path: string) => pathname === path;

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
            isActive("/") ? activeStyles : inactiveStyles
          }`}
        >
          Home
        </Link>
        <Link
          href="/rooms"
          className={`${linkStyles} ${
            isActive("/rooms") ? activeStyles : inactiveStyles
          }`}
        >
          Rooms
        </Link>
        <Link
          href="/profile"
          className={`${linkStyles} ${
            isActive("/profile") ? activeStyles : inactiveStyles
          }`}
        >
          Profile
        </Link>
      </div>
    </nav>
  );
}
