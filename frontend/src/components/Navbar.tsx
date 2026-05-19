"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/supabaseClient";

export default function Navbar() {
  // const [activePath, setActivePath] = useState("/");
  const activePath = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkStyles = "px-4 py-2 rounded-full transition-colors duration-200";
  const activeStyles = "bg-(--dark-blue) text-white hover:text-white/70";
  const inactiveStyles = "hover:text-(--dark-blue)/60";

  const router = useRouter();

  const [lastRoomId, setLastRoomId] = useState<string | null>(null);

  const links = [
    { href: `/room/${lastRoomId}`, label: "Your Room" },
    { href: "/rooms", label: "Rooms" },
    { href: "/profile", label: "Profile" },
  ];

  const isActive = (href: string) => {
    if (href.startsWith("/room/")) {
      return activePath.startsWith("/room/");
    }

    return activePath.startsWith(href);
  }

  // obtain the last
  useEffect(() => {
    const fetchLastRoom = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return
      }

      const { data } = await supabase.from("profiles").select("room").eq("id", user.id).single()

      if (data) {
        setLastRoomId(data.room)
      }
    }

    fetchLastRoom()
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-(--pastel-yellow) text-(--dark-blue) border-b-2 border-(--dark-blue)">
      <div className="h-16 flex items-center px-6 justify-between">
        <Link href="/">
          <span className="font-(family-name:--font-pixelify) font-bold text-2xl transition-transform duration-300 hover:scale-105">
            StudyNook.
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex gap-6 text-l">
          {links.map(({ href, label }) => (
            <Link
              key={label}
              href={href}

              className={`${linkStyles} ${isActive(href) ? activeStyles : inactiveStyles}`}
            >
              {label}
            </Link>
          ))}

          {/* sign out button */}
          <button
            onClick={async () => {
              await supabase.auth.signOut();

              router.push("/")
            }}
            className={`${linkStyles} ${inactiveStyles} cursor-pointer`}>
            Sign Out
          </button>
        </div>

        {/* Hamburger button */}
        <button
          type="button"
          className="md:hidden cursor-pointer p-2"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <div className="relative w-6 h-6">
            <Menu
              size={24}
              className={`absolute transition-all duration-200 ${menuOpen ? "opacity-0 rotate-90" : "opacity-100 rotate-0"}`}
            />
            <X
              size={24}
              className={`absolute transition-all duration-200 ${menuOpen ? "opacity-100 rotate-0" : "opacity-0 -rotate-90"}`}
            />
          </div>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div className="flex flex-col px-6 py-6 gap-2 border-(--dark-blue)">
          {links.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={() => {

                setMenuOpen(false);
              }}
              className={`${linkStyles} ${isActive(href) ? activeStyles : inactiveStyles}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
