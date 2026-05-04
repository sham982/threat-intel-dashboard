# Logo Replacement Script
# To replace the placeholder logo with your actual Tsedey Bank logo:

Write-Host "Tsedey Bank Logo Replacement Guide" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To use your actual Tsedey Bank logo:"
Write-Host ""
Write-Host "1. Save your logo as:"
Write-Host "   - logo.png (for sidebar) - recommended size: 32x32 or 64x64"
Write-Host "   - favicon.ico (for browser tab) - size: 32x32"
Write-Host "   - logo-large.png (for login page) - size: 128x128"
Write-Host ""
Write-Host "2. Place them in:"
Write-Host "   C:\Users\hp\Desktop\New folder\threat-intel-dashboard\artifacts\threat-dashboard\public\"
Write-Host ""
Write-Host "3. Then update the components to use your PNG files instead of SVG:"
Write-Host ""
Write-Host "   In src/components/TsedeyLogo.tsx, replace the SVG with:"
Write-Host '   <img src="/logo.png" alt="Tsedey Bank" className={className} />'
Write-Host ""
Write-Host "4. Rebuild: pnpm run build"
Write-Host ""

# Create a simple PNG version instruction
@'
// For production, replace the SVG in TsedeyLogo.tsx with:
export function TsedeyLogo({ className = "w-8 h-8", showText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo.png" alt="Tsedey Bank" className={className} />
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-widest text-sidebar-foreground uppercase leading-tight">
            Tsedey Bank
          </span>
          <span className="text-[9px] text-primary font-mono tracking-widest">
            SECURITY COMMAND CENTER
          </span>
        </div>
      )}
    </div>
  );
}
