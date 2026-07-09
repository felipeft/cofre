export default function Header({ title, subtitle, actions }) {
  return (
    <header className="flex items-center justify-between px-5 md:px-8 pt-[calc(env(safe-area-inset-top)+20px)] md:pt-8 pb-5">
      <div>
        <h1 className="text-[22px] md:text-[24px] font-semibold tracking-tight text-text">{title}</h1>
        {subtitle && <p className="text-[13px] text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
