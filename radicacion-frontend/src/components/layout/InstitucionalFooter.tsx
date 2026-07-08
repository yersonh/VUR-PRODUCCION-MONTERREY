import nexgoviaLogo from '@/assets/logos/nexgovia.png'

export function InstitucionalFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-[#1B3A6E] border-t border-white/10">
      <div className="flex items-center justify-center gap-2.5 h-full px-4">
        <span className="text-white text-[11px]">Desarrollado por</span>
        <img src={nexgoviaLogo} alt="NexGovIA" className="h-9 object-contain" />
        <span className="text-white/60 text-[11px]">·</span>
        <span className="text-white text-[11px] italic">Sovereign Data and AI</span>
        <span className="text-white/60 text-[11px]">·</span>
        <span className="text-white text-[11px]">© {year}</span>
      </div>
    </footer>
  )
}
