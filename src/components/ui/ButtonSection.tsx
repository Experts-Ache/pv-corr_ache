import { cn } from "@/lib/utils";

interface ButtonSectionProps {
  view: string;
  match: string;
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}

export const ButtonSection = ({ children, view, match, onClick, className }: ButtonSectionProps) => {
  const isActive = view === match;
  const classNameActive = isActive ? "!text-primary-foreground !bg-primary" : "";
  return (
    <button
      onClick={onClick}
      className={cn(`w-max flex items-center gap-2 px-3 py-2 rounded transition-colors `, classNameActive, className)}
    >
      {children}
    </button>
  );
};
