"use client";
import { useEffect, useRef, useState } from "react";
import { useAutoWander, type RoomUser } from "./CharacterWalkLogic";
import Character from "./Character";

interface Props {
  users: RoomUser[];
}

export default function CharacterAnimation({ users }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { characters } = useAutoWander(size.w, size.h, users);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {characters.map(c => (
        <Character key={c.id} {...c} />
      ))}
    </div>
  );
}