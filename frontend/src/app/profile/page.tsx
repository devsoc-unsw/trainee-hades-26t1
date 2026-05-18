"use client";
import Navbar from "@/components/Navbar";
import FilterBar from "@/components/FilterBar";
import RoomCard from "@/components/RoomCard";
import Image from "next/image";
import { useState } from "react";
import { Pencil } from "lucide-react";

//Mocked Data
const unlockedRooms = [
  {
    id: 1,
    name: "Data Struct",
    location: "Ainsworth Building",
    imageUrl: "/ainsworth-building.jpg",
  },
  { id: 2, name: "Geography", location: "Block C, Room 305", imageUrl: "" },
  { id: 3, name: "Geography", location: "Block C, Room 305", imageUrl: "" },
  { id: 4, name: "Geography", location: "Block C, Room 305", imageUrl: "" },
];

//Mocked Data
const currency = 4200;

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [userName, setUserName] = useState("User");
  const [filter, setFilter] = useState("");

  const filteredRooms = unlockedRooms.filter((room) =>
    room.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="pt-18 min-h-screen bg-(--light-blue)">
      <Navbar />
      <main className="flex flex-col items-center px-10 py-33 gap-8">
        {/* Profile */}
        <div className="relative w-full max-w-2xl bg-(--dark-blue) rounded-3xl px-10 pt-20 sm:pt-35 pb-8 flex flex-col items-center">
          {/* Profile Pic */}
          <div className="absolute -top-16 sm:-top-29 w-36 h-36 sm:w-60 sm:h-60 rounded-full bg-(--pastel-yellow) border-4 border-(--dark-blue) overflow-hidden">
            <Image
              src="/ainsworth-building.jpg" //hardcoded version
              alt="👽"
              fill
              className="object-cover"
            />
          </div>
          {/* Currency */}
          <p className="absolute top-4 left-6 text-white text-sm sm:text-xl font-(family-name:--font-pixelify)">
            Currency: {currency}
          </p>
          {/* Name */}
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
                className="bg-transparent border-b-2 border-white text-white text-2xl font-(family-name:--font-pixelify) tracking-widest text-center outline-none"
              />
            ) : (
              <h1 className="text-white text-base sm:text-xl font-(family-name:--font-pixelify) tracking-widest">
                Username: {userName}
              </h1>
            )}
            {/* Edit name tool */}
            <Pencil
              size={18}
              className="text-white/70 cursor-pointer hover:text-white"
              onClick={() => setEditing(true)}
            />
          </div>

          {/* Email */}
          <p className="text-white text-base sm:text-xl font-(family-name:--font-pixelify) mt-2">
            email: example@gmail.com {/* Hardcoded version */}
          </p>
        </div>
      </main>
    </div>
  );
}
