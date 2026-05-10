"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { MapPin } from "lucide-react";

type RoomCardProps = {
  id: number;
  name: string;
  location: string;
  imageUrl?: string;
};

export default function RoomCard({
  id,
  name,
  location,
  imageUrl,
}: RoomCardProps) {
  const [tooltip, setToolTip] = useState<{ x: number; y: number } | null>(null);

  return (
    <div
      className="relative"
      onMouseMove={(e) => {
        {
          /*Keep location bar in bound*/
        }
        const mouse = e.currentTarget.getBoundingClientRect();
        setToolTip({
          x: e.clientX - mouse.left,
          y: e.clientY - mouse.top,
        });
      }}
      onMouseLeave={() => setToolTip(null)}
    >
      <Link href={`/room/${id}`}>
        <div className="relative rounded-2xl overflow-hidden transition-transform duration-200 hover:scale-[1.02] border-2 border-(--dark-blue) h-48">
          {/* Background, image || white */}
          {imageUrl ? (
            <Image src={imageUrl} alt={name} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-white" />
          )}

          {/* Class name */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span
              className={`text-xs font-(family-name:--font-pixelify) ${
                imageUrl ? "text-white" : "text-(--dark-blue)"
              }`}
            >
              {name}
            </span>
          </div>
        </div>
      </Link>

      {/* Mouse Tooltip*/}
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
