"use client";

import { KeyboardEvent, useState } from "react";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export default function TagInput({ value, onChange, placeholder }: Props) {
  const [input, setInput] = useState("");

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (value.some((v) => v.toLowerCase() === tag.toLowerCase())) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
      setInput("");
    }
  };

  return (
    <div className="border border-slate-300 rounded-md p-2 bg-white">
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag) => (
          <span key={tag} className="bg-blue-100 text-blue-800 rounded-full px-2 py-1 text-xs">
            {tag}
            <button
              type="button"
              className="ml-1"
              onClick={() => onChange(value.filter((v) => v !== tag))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className="input"
        value={input}
        placeholder={placeholder}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          addTag(input);
          setInput("");
        }}
      />
    </div>
  );
}
