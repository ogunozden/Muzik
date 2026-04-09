"use client";

import React from "react";
import {Select as HeroUISelect, SelectProps, SelectItem} from "@heroui/react";

type CustomSelectProps = Omit<SelectProps, "className" | "children" | "items"> & {
  label?: string;
  ariaLabel: string;
  className?: string;
  items?: Array<{key: string; label: string}>;
};

export function Select({
  label,
  ariaLabel,
  className = "",
  items,
  ...props
}: CustomSelectProps) {
  return (
    <HeroUISelect
      {...props}
      label={label}
      aria-label={ariaLabel}
      className={className}
      classNames={{
        base: "w-full",
        trigger: "bg-white border border-[#E5E0D8] text-[#1A1A1A] data-[hover=true]:border-[#8B7355]",
        value: "text-[#1A1A1A]",
        label: "text-[#6B6B6B]",
        listbox: "bg-white p-0",
        popoverContent: "bg-white border border-[#E5E0D8] shadow-lg",
      }}
      items={items ?? []}
    >
      {(item) => (
        <SelectItem 
          key={item.key} 
          textValue={item.label}
          className="text-[#1A1A1A] data-[hover=true]:bg-[#FAF7F2] data-[selected=true]:bg-[#5C4033] data-[selected=true]:text-white cursor-pointer"
        >
          {item.label}
        </SelectItem>
      )}
    </HeroUISelect>
  );
}
