import { FlaskConical } from 'lucide-react'

export default function DemoNotice() {
  return (
    <div className="mx-5 mt-4 flex items-start gap-2 rounded-control border border-info/25 bg-info/10 px-3 py-2 text-[12px] leading-relaxed text-text-muted md:mx-8">
      <FlaskConical size={15} className="mt-0.5 shrink-0 text-info" />
      <p><strong className="font-semibold text-text">Modo demonstração</strong> — os dados são fictícios e permanecem apenas neste navegador.</p>
    </div>
  )
}
