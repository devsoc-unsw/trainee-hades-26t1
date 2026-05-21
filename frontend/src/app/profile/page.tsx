"use client";
import Navbar from "@/components/Navbar";
import Loading from "@/components/Loading";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { supabase } from "@/supabaseClient";
import { Feedback } from "@/lib/types";
import { FeedbackModal } from "@/components/FeedbackModal";
import { characters } from "@/lib/characters";

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [userName, setUserName] = useState("User");
  const [currency, setCurrency] = useState(0);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const getUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log(session);
      const token = session?.access_token;
      if (!token) {
        console.error("No access token found");
        setFeedback({
          open: true,
          title: "Authentication error",
          description: "You must be logged in to view your profile.",
          actionLabel: "Close",
          variant: "error",
        });
        setLoading(false);
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setUserName(data.name);
      setAvatarUrl(data.character_id);
      setCurrency(data.currency);
      setEmail(session?.user.email || null);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setFeedback({
        open: true,
        title: "Error",
        description: "We couldn't load your profile data. Please try again later.",
        actionLabel: "Close",
        variant: "error",
      });
      setLoading(false);
    }
  }

  const updateUserData = async (updatedFields: { name?: string }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        console.error("No access token found");
        setFeedback({
          open: true,
          title: "Authentication error",
          description: "You must be logged in to update your profile.",
          actionLabel: "Close",
          variant: "error",
        });
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedFields),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error updating user data:", errorData);
        setFeedback({
          open: true,
          title: "Update failed",
          description: errorData.error || "We couldn't update your profile. Please try again later.",
          actionLabel: "Close",
          variant: "error",
        });
      } else {
        getUserData(); // Refresh data after update
      }
    } catch (err) {
      console.error("Error updating user data:", err);
      setFeedback({
        open: true,
        title: "Update failed",
        description: "We couldn't update your profile. Please try again later.",
        actionLabel: "Close",
        variant: "error",
      });
    }
  };

  const handleNameChange = (newName: string) => {
    // On key down
    updateUserData({ name: newName });
  };

  useEffect(() => {
    getUserData();
  }, []);

  return (
    <div className="pt-18 min-h-screen bg-(--light-blue)">
      <Navbar />
      <main className="flex flex-col items-center px-10 py-33 gap-8">
        {loading ? (
          <Loading />
        ) : (
          <>
            {/* Profile */}
            <div className="relative w-full max-w-2xl bg-(--dark-blue) rounded-3xl px-10 pt-20 sm:pt-35 pb-8 flex flex-col items-center">
              {/* Profile Pic */}
              <div className="absolute -top-16 sm:-top-29 w-36 h-36 sm:w-60 sm:h-60 rounded-full bg-(--pastel-yellow) border-4 border-(--dark-blue) overflow-hidden">
                {avatarUrl ? (
                  <Image
                    src={characters.find((c) => c.id === avatarUrl)?.src || "/assets/girl1_Walk.png"}
                    alt="profile picture"
                    fill
                    className="object-cover object-left-top"
                    style={{
                      objectFit: "cover",
                      objectPosition: "left center",
                      transform: "scale(1.2)",
                      transformOrigin: "center",
                      top: "-20%",
                    }}

                  />
                ) : (
                  <div className="w-full h-full bg-(--pastel-yellow) flex items-center justify-center">
                    <span className="text-(--dark-blue) text-4xl">👽</span>
                  </div>
                )}
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleNameChange(userName);
                        setEditing(false);
                      }
                    }}
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
                email: {email}
              </p>
            </div>
          </>
        )}
      </main>
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
        variant={feedback?.variant ?? "error"}
      />
    </div>
  );
}
