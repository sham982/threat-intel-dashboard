interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function TsedeyLogo({ className = "w-8 h-8", showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <img 
        src="/logo.png" 
        alt="Tsedey Bank" 
        className={`${className} object-contain`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-widest text-sidebar-foreground uppercase leading-tight">
            Tsedey Bank
          </span>
          <span className="text-[9px] text-primary font-mono tracking-widest">
            THREAT INTELLIGENCE
          </span>
        </div>
      )}
    </div>
  );
}

// Simplified logo icon for small spaces
export function TsedeyLogoIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="Tsedey Bank" 
      className={`${className} object-contain`}
    />
  );
}

