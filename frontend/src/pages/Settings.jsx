import { useEffect, useState } from 'react'
import { CalendarClock, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react'
import Header from '@/layout/Header'
import SettingsGroup from '@/components/settings/SettingsGroup'
import SettingsRow from '@/components/settings/SettingsRow'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { useSettings } from '@/hooks/useSettings'
import { settingsService } from '@/services/settings.service'

const percent = (rate) => String(rate * 100)
const fraction = (value) => Number(String(value).replace(',', '.')) / 100
const dateTime = (value) => value ? new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('pt-BR') : 'Indisponível'

export default function Settings() {
  const { showToast } = useToast()
  const { user, logout, applyProfile } = useAuth()
  const { settings, loading, error, update } = useSettings()
  const [displayName, setDisplayName] = useState(user?.displayName || user?.name || '')
  const [offerRate, setOfferRate] = useState(percent(settings.defaultOfferRate))
  const [titheRate, setTitheRate] = useState(percent(settings.defaultTitheRate))
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingFinancial, setSavingFinancial] = useState(false)

  useEffect(() => {
    setOfferRate(percent(settings.defaultOfferRate))
    setTitheRate(percent(settings.defaultTitheRate))
  }, [settings.defaultOfferRate, settings.defaultTitheRate])

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

  const saveFinancial = async (event) => {
    event.preventDefault()
    setSavingFinancial(true)
    try {
      const saved = await update({ defaultOfferRate: fraction(offerRate), defaultTitheRate: fraction(titheRate) })
      setOfferRate(percent(saved.defaultOfferRate))
      setTitheRate(percent(saved.defaultTitheRate))
      showToast('Preferências financeiras salvas', 'success')
    } catch (requestError) {
      showToast(requestError.message || 'Não foi possível salvar as preferências.', 'error')
    } finally {
      setSavingFinancial(false)
    }
  }

  return (
    <div>
      <Header title="Ajustes" subtitle="Perfil, preferências financeiras e sessão" />

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

        <SettingsGroup title="Preferências financeiras">
          <form onSubmit={saveFinancial} className="grid gap-4 p-4 sm:grid-cols-2">
            <Input label="Oferta padrão (%)" type="number" inputMode="decimal" min="0" max="100" step="0.01" required value={offerRate} onChange={(event) => setOfferRate(event.target.value)} />
            <Input label="Dízimo padrão (%)" type="number" inputMode="decimal" min="0" max="100" step="0.01" required value={titheRate} onChange={(event) => setTitheRate(event.target.value)} />
            <p className="text-[12px] text-text-faint sm:col-span-2">Categorias com taxa própria continuam prevalecendo. Alterações afetam somente novos cálculos; transações antigas mantêm seu snapshot.</p>
            <Button type="submit" className="sm:col-span-2" disabled={loading || savingFinancial}>{savingFinancial ? 'Salvando…' : 'Salvar preferências'}</Button>
            {error && <p role="alert" className="text-[12px] text-expense sm:col-span-2">{error}</p>}
          </form>
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
      </div>
    </div>
  )
}
