"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin } from "lucide-react";

type RoomCardProps = {
  id: number;
  name: string;
  location?: string;
  imageUrl?: string;
  onClick?: () => Promise<void>;
};

export default function RoomCard({
  id,
  name,
  location = "Unknown Location",
  imageUrl,
  onClick,
}: RoomCardProps) {
  const [tooltip, setToolTip] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      onClick={onClick}
      className="relative"
      onMouseMove={(e) => {
        const mouse = e.currentTarget.getBoundingClientRect();
        setToolTip({
          x: e.clientX - mouse.left,
          y: e.clientY - mouse.top,
        });
      }}
      onMouseLeave={() => setToolTip(null)}
    >
      <div className="relative rounded-2xl overflow-hidden transition-transform duration-200 hover:scale-[1.02] border-2 border-(--dark-blue) h-48">
        {/* Background, image || white */}
        {imageUrl ? (
          <Image src={imageUrl} alt={name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full bg-white" />
        )}

        {/* Room name */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <span
            className="text-xl font-(family-name:--font-pixelify) text-white text-center"
            style={{
              textShadow: "0 0 4px var(--dark-blue), 0 0 4px var(--dark-blue), 0 0 8px var(--dark-blue), 2px 2px 0px var(--dark-blue), -2px -2px 0px var(--dark-blue), 2px -2px 0px var(--dark-blue), -2px 2px 0px var(--dark-blue)",
            }}
          >
            {name}
          </span>
        </div>
      </div>

      {/* Mouse Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-(--pastel-yellow) border-2 border-(--dark-blue) whitespace-nowrap"
          style={{
            left: tooltip.x,
            top: tooltip.y - 45,
          }}
        >
          <MapPin size={15} className="text-(--dark-blue)" />
          <span className="text-[0.75rem] font-(family-name:--font-pixelify) text-(--dark-blue) uppercase">
            {location}
          </span>
        </div>
      )}
    </div>
  );
}