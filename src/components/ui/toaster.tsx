import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        className: "border-border bg-background text-foreground",
        style: {
          "--normal-bg": "hsl(var(--background))",
          "--normal-border": "hsl(var(--border))",
          "--normal-text": "hsl(var(--foreground))",
          "--success-bg": "hsl(142.1 76.2% 36.3% / 15%)",
          "--success-border": "hsl(142.1 76.2% 36.3%)",
          "--success-text": "hsl(142.1 76.2% 36.3%)",
          "--error-bg": "hsl(0 84.2% 60.2% / 15%)",
          "--error-border": "hsl(0 84.2% 60.2%)",
          "--error-text": "hsl(0 84.2% 60.2%)",
        },
      }}
    />
  );
}
