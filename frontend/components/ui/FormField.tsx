"use client";

import { ChangeEvent } from "react";

type Props = {
  label: string;
  name: string;
  type?: "text" | "textarea" | "date" | "month" | "number" | "email";
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  error?: string;
  rows?: number;
};

export default function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  disabled,
  min,
  max,
  error,
  rows = 3,
}: Props) {
  return (
    <div className="mb-3">
      <label htmlFor={name} className={`block text-sm font-medium mb-1 ${disabled ? "text-slate-400" : ""}`}>
        {label}
        {required ? <span className="text-red-600 ml-1">*</span> : null}
      </label>
      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          className="input min-h-24 disabled:bg-slate-100 disabled:text-slate-500"
          value={value}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
        />
      ) : (
        <input
          id={name}
          name={name}
          className="input disabled:bg-slate-100 disabled:text-slate-500"
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          onChange={onChange}
        />
      )}
      {error ? <p className="text-sm text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}
