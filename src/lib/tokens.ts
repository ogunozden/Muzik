export const tokens = {
  colors: {
    primary: {
      base: "bg-[#5C4033] text-white",
      hover: "hover:bg-[#4A3428]",
      light: "bg-[#8B7355] text-white",
    },
    secondary: {
      base: "bg-[#8B7355] text-white",
      hover: "hover:bg-[#725F46]",
    },
    accent: {
      base: "bg-[#C4A77D] text-white",
      hover: "hover:bg-[#B8956A]",
    },
    background: {
      base: "bg-[#FAF7F2]",
      surface: "bg-[#FFFFFF]",
    },
    text: {
      primary: "text-[#1A1A1A]",
      secondary: "text-[#6B6B6B]",
    },
    border: {
      base: "border-[#E5E0D8]",
    },
    feedback: {
      error: "text-[#D32F2F]",
      success: "text-[#388E3C]",
    },
  },
  spacing: {
    xs: "p-1",
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
  },
  radius: {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  },
} as const;
