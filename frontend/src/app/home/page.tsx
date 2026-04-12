"use client";
import Navbar from "@/components/Navbar";
import FilterBar from "@/components/FilterBar";
import RoomCard from "@/components/RoomCard";
import { useState } from "react";

//Mock Data for now
const rooms = [
  {
    id: 1,
    name: "Data Struct",
    subject: "Computer Science",
    location: "Ainsworth Building",
    imageUrl: "/ainsworth-building.jpg",
  },
  {
    id: 2,
    name: "Ethics",
    subject: "Philosophy",
    location: "Block B, Room 204",
    imageUrl: "",
  },
  {
    id: 3,
    name: "Geography",
    subject: "phsyics",
    location: "Block C, Room 305",
    imageUrl: "",
  },
  {
    id: 4,
    name: "UM Science",
    subject: "Science",
    location: "Block D, Room 406",
    imageUrl: "",
  },
  {
    id: 5,
    name: "COMP2511",
    subject: "Computer Science",
    location: "Block E Room 507",
    imageUrl: "",
  },
  {
    id: 6,
    name: "COMP6080",
    subject: "Computer Science",
    location: "Block F, Room 608",
    imageUrl: "",
  },
];

export default function Home() {
  const [filter, setFilter] = useState("");

  const filteredRooms = rooms.filter(
    (room) =>
      room.name.toLowerCase().includes(filter.toLowerCase()) ||
      room.subject.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="pt-18 overflow-x-hidden">
      <Navbar />
      <main className="px-10 py-8">
        <FilterBar value={filter} onChange={setFilter} />

        <div className="grid grid-cols-3 gap-6 mt-8">
          {filteredRooms.map((room) => (
            <RoomCard
              id={room.id}
              key={room.id}
              name={room.name}
              location={room.location}
              imageUrl={room.imageUrl || undefined}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
