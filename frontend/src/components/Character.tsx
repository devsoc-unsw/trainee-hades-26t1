import "./RoomIllustration.css";

interface CharacterProps {
  x: number;
  y: number;
  facingRight: boolean;
  name: string;
}

export default function Character({ x, y, facingRight, name }: CharacterProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        // Anchor to the ground line from the bottom of the div
        top: y - 150,
        width: 128,
        height: 150,
      }}
    >
      {/* Name tag */}
      <div
        style={{
          position: "absolute",
          top: -18,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.55)",
          color: "white",
          fontSize: 10,
          fontFamily: "monospace",
          padding: "2px 6px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {name}
      </div>

      {/* Sprite */}
      <div
        className="character"
        style={{
          transform: `scale(1.2) ${facingRight ? "scaleX(1)" : "scaleX(-1)"}`,
          transformOrigin: "bottom left",
        }}
      />
    </div>
  );
}