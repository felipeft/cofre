import { useState } from 'react'
import { CalendarClock, LogOut, Mail, Monitor, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react'
import Header from '@/layout/Header'
import SettingsGroup from '@/components/settings/SettingsGroup'
import SettingsRow from '@/components/settings/SettingsRow'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { settingsService } from '@/services/settings.service'
import GoogleSheetsSettings from '@/components/settings/GoogleSheetsSettings'
import DataManagementSettings from '@/components/settings/DataManagementSettings'

const dateTime = (value) => value ? new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('pt-BR') : 'Indisponível'

export default function Settings() {
  const { showToast } = useToast()
  const { user, logout, applyProfile } = useAuth()
  const { settings, loading, update } = useSettings()
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingTheme, setSavingTheme] = useState(false)

  const saveProfile = async (event) => {
    event.preventDefault()
    setSavingProfile(true)
    try {
      const response = await settingsService.updateProfile({ displayName: displayName.trim() })
      applyProfile(response.data)
      setDisplayName(response.data.displayName)
      showToast('Perfil salvo', 'success')
    } catch (requestError) {
      showToast(requestError.message || 'Não foi possível salvar o perfil.', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const saveTheme = async (theme) => {
    if (savingTheme || theme === settings.theme) return
    setSavingTheme(true)
    try {
      await update({ theme })
      showToast('Aparência atualizada', 'success')
    } catch (requestError) {
      showToast(requestError.message || 'Não foi possível alterar a aparência.', 'error')
    } finally {
      setSavingTheme(false)
    }
  }

  const themeOptions = [
    { value: 'system', label: 'Sistema', description: 'Segue o dispositivo', icon: Monitor },
    { value: 'light', label: 'Claro', description: 'Sempre claro', icon: Sun },
    { value: 'dark', label: 'Escuro', description: 'Sempre escuro', icon: Moon },
  ]

  return (
    <div>
      <Header title="Ajustes" subtitle="Perfil, aparência, integrações e sessão" />

      <div className="px-5 md:px-8 pb-8 max-w-[620px] flex flex-col gap-6">
        <SettingsGroup title="Perfil">
          <form onSubmit={saveProfile} className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar da conta Google" className="h-12 w-12 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-income/15 text-income"><UserRound size={20} /></div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{user?.googleName || user?.name}</p>
                <p className="truncate text-[12px] text-text-muted">Nome fornecido pelo Google</p>
              </div>
            </div>
            <Input label="Nome de exibição no Cofre" value={displayName} maxLength={80} required onChange={(event) => setDisplayName(event.target.value)} />
            <Button type="submit" disabled={savingProfile || !displayName.trim()}>{savingProfile ? 'Salvando…' : 'Salvar perfil'}</Button>
          </form>
        </SettingsGroup>

        <SettingsGroup title="Aparência">
          <div className="p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Tema da interface">
              {themeOptions.map(({ value, label, description, icon: Icon }) => {
                const selected = settings.theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={loading || savingTheme}
                    onClick={() => saveTheme(value)}
                    className={`focus-ring flex min-h-[76px] items-center gap-3 rounded-control border p-3 text-left transition-colors disabled:opacity-50 ${
                      selected
                        ? 'border-income/50 bg-income/10 text-income'
                        : 'border-border bg-surface-2 text-text hover:bg-surface-3'
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold">{label}</span>
                      <span className={`block text-[11px] ${selected ? 'text-income' : 'text-text-muted'}`}>{description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-[12px] text-text-faint">
              No modo Sistema, o Cofre acompanha automaticamente a aparência do dispositivo. Sem preferência disponível, utiliza o tema claro.
            </p>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Conta e sessão">
          <SettingsRow icon={Mail} label="E-mail Google" value={user?.email} />
          <SettingsRow icon={ShieldCheck} label="Provedor" value="Google" />
          <SettingsRow icon={CalendarClock} label="Conta criada" value={dateTime(user?.createdAt)} />
          <SettingsRow icon={CalendarClock} label="Sessão iniciada" value={dateTime(user?.session?.createdAt)} />
          <SettingsRow icon={CalendarClock} label="Sessão expira" value={dateTime(user?.session?.expiresAt)} />
          <SettingsRow icon={LogOut} label="Sair da conta" onClick={async () => {
            try { await logout() } catch (requestError) { showToast(requestError.message || 'Não foi possível sair.', 'error') }
          }} />
        </SettingsGroup>

        <SettingsGroup title="Google Sheets">
          <GoogleSheetsSettings />
        </SettingsGroup>

        <SettingsGroup title="Gerenciamento de dados">
          <DataManagementSettings />
        </SettingsGroup>
      </div>
    </div>
  )
}
