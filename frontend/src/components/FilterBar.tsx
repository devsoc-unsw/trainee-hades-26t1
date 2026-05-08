"use client";
import { Filter } from "lucide-react";

type FilterBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function FilterBar({ value, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl w-72 bg-(--pastel-yellow) border-2 border-(--dark-blue)">
      <input
        type="text"
        placeholder="Filter..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm text-(--dark-blue) font-(family-name:--font-pixelify) placeholder:text-(--dark-blue)/50"
      />
      <Filter size={15} className="text-(--dark-blue) shrink-0" />
    </div>
  );
}
