"use client";
import Navbar from "@/components/Navbar";
import FilterBar from "@/components/FilterBar";
import RoomCard from "@/components/RoomCard";
import { useState } from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from '@/supabaseClient';

interface Room {
  id: number;
  roomTitle: string;
  createdAt: string;
  createdBy: string;
}

export default function Home() {
  const [filter, setFilter] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);

  useEffect(() => {
    setFilteredRooms(
      rooms.filter(
        (room) =>
          room.roomTitle.toLowerCase().includes(filter.toLowerCase()),
      ),
    );
  }, [filter]);

  useEffect(() => {
    setFilter("");
  }, []);

  const handleCreateRoom = async (title: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
  
      if (!token) {
        alert("You must be logged in to create a room.");
        return;
      }
  
      const newRoom = {
        roomTitle: title
      }
  
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms/room`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(newRoom)
        }
      );
  
      if (!resp.ok) {
        const errorData = await resp.json();
        console.error("Error creating room:", errorData.error);
        alert(`Failed to create room: ${errorData.error}`);
        return;
      }
  
      const data = await resp.json();
      console.log("Room created successfully:", data);
      alert("Room created successfully!");
    } catch (error) {
      console.error("Error creating room:", error);
    }
  }

  const handleGetRooms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
  
      if (!token) {
        alert("You must be logged in to view rooms.");
        return;
      }
  
      const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/rooms`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      );
  
      if (!resp.ok) {
        const errorData = await resp.json();
        console.error("Error fetching rooms:", errorData.error);
        alert(`Failed to fetch rooms: ${errorData.error}`);
        return;
      }
  
      const data = await resp.json();
      console.log("Rooms fetched successfully:", data);
      setRooms(data);
      setFilteredRooms(data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  }

  // const handleLogin = async () => {
  //   try {
  //     const email = "chud@mail.com";
  //     const password = "chuddychudchud";
        
  //     const resp = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/signin`, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json"
  //       },
  //       body: JSON.stringify({ email, password })
  //     });
  
  //     if (!resp.ok) {
  //       const errorData = await resp.json();
  //       console.error("Login error:", errorData.error);
  //       alert(`Login failed: ${errorData.error}`);
  //       return;
  //     }
  
  //     const data = await resp.json();
  //     console.log("Login successful:", data);
  //   } catch (error) {
  //     console.error("Error during login:", error);
  //   }
  // }

  useEffect(() => {
    handleGetRooms();
  }, []);

  return (
    <div className="pt-18 overflow-x-hidden">
      <Navbar />
      <main className="px-10 py-8">
        <div className="flex justify-between items-center">
          <FilterBar value={filter} onChange={setFilter} />
          <Button 
            variant="outline" 
            className="text-(--dark-blue) hover:text-(--dark-blue) border-(--dark-blue) border-2 cursor-pointer"
            onClick={() => handleCreateRoom("Backrooms!")}
          >
            + New Room
          </Button>
          {/* <Button onClick={() => handleLogin()}>
            Login (temporary)
          </Button> */}
        </div>

        <div className="grid grid-cols-3 gap-6 mt-8">
          {filteredRooms.map((room) => (
            <RoomCard
              id={room.id}
              key={room.id}
              name={room.roomTitle}
              // location={}
              // imageUrl={}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
