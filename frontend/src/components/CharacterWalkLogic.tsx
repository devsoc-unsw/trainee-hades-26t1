import { useState, useEffect, useRef } from "react";

export interface Character {
  id: string;
  name: string;
  characterId: string;
  x: number;
  y: number;
  facingRight: boolean;
  targetX: number;
}

export interface RoomUser {
  userId: string;
  name: string;
  characterId?: string;
}

const SPEED = 40;
const SPRITE_W = 128;
const FLOOR_OFFSET = 20;

export function useAutoWander(roomW: number, roomH: number, users: RoomUser[]) {
  const GROUND_Y = roomH - FLOOR_OFFSET;
  const [characters, setCharacters] = useState<Character[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const usersRef = useRef(users);
  const roomWRef = useRef(roomW);
  const groundYRef = useRef(GROUND_Y);

  // Keep refs in sync without triggering effects
  usersRef.current = users;
  roomWRef.current = roomW;
  groundYRef.current = GROUND_Y;

  // Sync characters with users outside of an effect
  const syncCharacters = (prev: Character[]): Character[] => {
    if (roomW === 0 || roomH === 0) return prev;
    const existingById = new Map(prev.map(c => [c.id, c]));
    return users.map(u => {
      const existing = existingById.get(u.userId);
      if (existing) {
        return { ...existing, name: u.name, characterId: u.characterId ?? "girl1" };
      }
      return {
        id: u.userId,
        name: u.name,
        characterId: u.characterId ?? "girl1",
        x: Math.random() * roomW,
        y: GROUND_Y,
        facingRight: true,
        targetX: Math.random() * roomW,
      };
    });
  };

  // Run sync when users/room size changes — using functional update avoids the lint issue
  useEffect(() => {
    setCharacters(prev => syncCharacters(prev));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, roomW, roomH]);

  useEffect(() => {
    if (roomW === 0 || roomH === 0) return;

    let rafId: number;

    const loop = (now: number) => {
      const delta = lastTimeRef.current !== null
        ? Math.min(now - lastTimeRef.current, 100)
        : 16;
      lastTimeRef.current = now;

      setCharacters(prev =>
        prev.map(c => {
          const dx = c.targetX - c.x;
          const dist = Math.abs(dx);

          if (dist < 5) {
            return { ...c, targetX: Math.random() * roomWRef.current };
          }

          const step = (SPEED * delta) / 1000;
          let newX = c.x + (dx / dist) * step;

          if (newX < -SPRITE_W) newX = roomWRef.current;
          if (newX > roomWRef.current) newX = -SPRITE_W;

          return { ...c, x: newX, y: groundYRef.current, facingRight: dx > 0 };
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
  }, [roomW, roomH]);

  return { characters };
}