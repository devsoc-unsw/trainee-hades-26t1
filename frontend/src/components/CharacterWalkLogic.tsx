import { useState, useEffect, useRef } from "react";

export interface Character {
  id: string;
  name: string;
  x: number;
  y: number;
  facingRight: boolean;
  targetX: number;
}

const SPEED = 40;
const SPRITE_W = 128;
const FLOOR_OFFSET = 20;

function randTarget(roomW: number) {
  return { targetX: Math.random() * roomW };
}

function makeCharacters(roomW: number, groundY: number): Character[] {
  return [
    { id: "1", name: "Alex", x: 100, y: groundY, facingRight: true,  ...randTarget(roomW) },
    { id: "2", name: "Sam",  x: 250, y: groundY, facingRight: false, ...randTarget(roomW) },
    { id: "3", name: "Jess", x: 400, y: groundY, facingRight: true,  ...randTarget(roomW) },
  ];
}

export function useAutoWander(roomW: number, roomH: number) {
  const GROUND_Y = roomH - FLOOR_OFFSET;

  const [characters, setCharacters] = useState<Character[]>([]);

  const lastTimeRef = useRef<number | null>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (roomW === 0 || roomH === 0) return;

    let rafId: number;

    const loop = (now: number) => {
      // Seed characters on the very first valid frame
      if (!initialised.current) {
        initialised.current = true;
        setCharacters(makeCharacters(roomW, GROUND_Y));
        lastTimeRef.current = now;
        rafId = requestAnimationFrame(loop);
        return;
      }

      const delta = lastTimeRef.current !== null
        ? Math.min(now - lastTimeRef.current, 100)
        : 16;
      lastTimeRef.current = now;

      setCharacters(prev =>
        prev.map(c => {
          const dx = c.targetX - c.x;
          const dist = Math.abs(dx);

          if (dist < 5) {
            return { ...c, targetX: Math.random() * roomW };
          }

          const step = (SPEED * delta) / 1000;
          let newX = c.x + (dx / dist) * step;

          if (newX < -SPRITE_W) newX = roomW;
          if (newX > roomW)     newX = -SPRITE_W;

          return {
            ...c,
            x: newX,
            y: GROUND_Y,
            facingRight: dx > 0,
          };
        })
      );

      rafId = requestAnimationFrame(loop);
    };

    lastTimeRef.current = null;
    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      lastTimeRef.current = null;
    };
  }, [roomW, roomH, GROUND_Y]);

  return { characters };
}