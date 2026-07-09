import { Moon, Download, Upload, CloudUpload, Info, ChevronRight, Vault } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import { useToast } from '@/context/ToastContext'

export default function Settings() {
  const { showToast } = useToast()

  const simulate = (message) => () => showToast(message, 'info')

  return (
    <div>
      <Header title="Ajustes" subtitle="Preferências do aplicativo" />

      <div className="px-5 md:px-8 pb-8 max-w-[560px] flex flex-col gap-6">
        <SettingsGroup title="Aparência">
          <SettingsRow icon={Moon} label="Tema" value="Escuro" onClick={simulate('Apenas o tema escuro está disponível por enquanto')} />
        </SettingsGroup>

        <SettingsGroup title="Dados">
          <SettingsRow icon={CloudUpload} label="Backup" value="Automático" onClick={simulate('Backup automático simulado — sem backend ainda')} />
          <SettingsRow icon={Download} label="Exportar CSV" onClick={simulate('Exportação simulada — em breve integrada ao backend')} />
          <SettingsRow icon={Upload} label="Importar CSV" onClick={simulate('Importação simulada — em breve integrada ao backend')} />
        </SettingsGroup>

        <SettingsGroup title="Sobre">
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-income/15 text-income">
              <Vault size={18} />
            </div>
            <div>
              <p className="text-[14px] font-medium text-text">Cofre</p>
              <p className="text-[12px] text-text-muted">Versão 0.1.0 · Frontend com dados fictícios</p>
            </div>
          </div>
          <SettingsRow icon={Info} label="Sobre este app" onClick={simulate('Cofre é uma interface pessoal para registro rápido de movimentações')} />
        </SettingsGroup>
      </div>
    </div>
  )
}

function SettingsGroup({ title, children }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-text-muted uppercase tracking-wide mb-3">{title}</h3>
      <Card className="divide-y divide-border-soft overflow-hidden">{children}</Card>
    </div>
  )
}

function SettingsRow({ icon: Icon, label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="focus-ring w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2/60 transition-colors"
    >
      <Icon size={17} className="text-text-muted shrink-0" strokeWidth={2} />
      <span className="flex-1 text-[14px] text-text">{label}</span>
      {value && <span className="text-[13px] text-text-faint">{value}</span>}
      <ChevronRight size={16} className="text-text-faint shrink-0" />
    </button>
  )
}
