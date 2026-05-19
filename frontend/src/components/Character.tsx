import "./RoomIllustration.css";

interface CharacterProps {
  x: number;
  y: number;
  facingRight: boolean;
  name: string;
  characterId: string;
}

export default function Character({ x, y, facingRight, name, characterId }: CharacterProps) {
  return (
    <div
      className="absolute w-[128px] h-[150px]"
      style={{ left: x, top: y - 150 }}
    >
      {/* name tag */}
      <div className="absolute top-[15px] left-1/2 -translate-x-1/2 px-2 py-[2px] text-[10px] font-mono text-black bg-[#fffcd6]/60 rounded whitespace-nowrap pointer-events-none z-10">
        {name}
      </div>

      {/* sprite wrapper */}
      <div
        className="absolute bottom-0 left-0 w-full h-full"
        style={{ transform: facingRight ? "scaleX(1)" : "scaleX(-1)" }}
      >
        <div className={`character-base ${characterId} scale-[1.2] origin-bottom-left`} />
      </div>
    </div>
  );
}