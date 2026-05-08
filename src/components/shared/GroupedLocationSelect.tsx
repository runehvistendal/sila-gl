"use client"

import { cn } from "@/lib/utils"

export type GroupedLocationOption = { name: string; isHub: boolean }

type Props = Omit<
  React.ComponentPropsWithoutRef<"select">,
  "onChange" | "children"
> & {
  value: string
  onChange: (value: string) => void
  locations: GroupedLocationOption[]
  excludeNames?: string[]
  placeholder: string
  majorGroupLabel: string
  otherGroupLabel: string
}

export function GroupedLocationSelect({
  value,
  onChange,
  locations,
  excludeNames = [],
  placeholder,
  majorGroupLabel,
  otherGroupLabel,
  className,
  id,
  ...rest
}: Props) {
  const ex = new Set(excludeNames)
  const majors = locations.filter((l) => l.isHub && !ex.has(l.name))
  const others = locations.filter((l) => !l.isHub && !ex.has(l.name))

  return (
    <select
      id={id}
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full h-10 rounded-xl border border-input bg-transparent px-3 text-sm text-foreground shadow-sm",
        "focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer",
        className,
      )}
    >
      <option value="">{placeholder}</option>
      <optgroup label={majorGroupLabel}>
        {majors.map((l) => (
          <option key={l.name} value={l.name}>
            {l.name}
          </option>
        ))}
      </optgroup>
      <optgroup label={otherGroupLabel}>
        {others.map((l) => (
          <option key={l.name} value={l.name}>
            {l.name}
          </option>
        ))}
      </optgroup>
    </select>
  )
}
