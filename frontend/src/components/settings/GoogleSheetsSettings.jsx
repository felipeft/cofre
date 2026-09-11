import { useEffect, useState } from 'react'
import { AlertCircle, ExternalLink, FileSpreadsheet, Link2, RefreshCw, Unplug } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Dialog from '@/components/ui/Dialog'
import { useToast } from '@/contexts/ToastContext'
import { useGoogleSheetsIntegration } from '@/hooks/useGoogleSheetsIntegration'
import { ROUTES } from '@/constants/routes'

const labels = {
  not_connected: 'Não conectado', authorized: 'Autorizado — crie sua planilha', ready: 'Pronto',
  reauthorization_required: 'Autorização expirada — reconecte', file_missing: 'Arquivo não encontrado',
}
const dateTime = (value) => value ? new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('pt-BR') : 'Nunca'

export default function GoogleSheetsSettings() {
  const { showToast } = useToast()
  const sheets = useGoogleSheetsIntegration()
  const [startYear, setStartYear] = useState(new Date().getFullYear())
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  useEffect(() => {
    if (sheets.integration?.suggestedStartYear) setStartYear(sheets.integration.suggestedStartYear)
  }, [sheets.integration?.suggestedStartYear])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('sheets') === 'connected') showToast('Google Sheets conectado', 'success')
    if (params.has('sheets_error')) showToast('Não foi possível autorizar o Google Sheets. Tente novamente.', 'error')
    if (params.has('sheets') || params.has('sheets_error')) window.history.replaceState({}, '', window.location.pathname)
  }, [showToast])

  const toastAction = async (operation, success) => {
    try { await operation(); showToast(success, 'success') }
    catch (error) { showToast(error.message, 'error') }
  }

  if (sheets.loading) return <div className="p-4 text-[13px] text-text-muted">Consultando integração…</div>
  const integration = sheets.integration || { status: 'not_connected' }
  const canCreate = integration.status === 'authorized' || integration.status === 'file_missing'
  const ready = integration.status === 'ready'

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-income/15 text-income flex items-center justify-center shrink-0"><FileSpreadsheet size={20} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">{labels[integration.status] || integration.status}</p>
          <p className="text-[12px] text-text-muted mt-1">Visão financeira anual e cadastro de despesas simples. O Cofre continua sendo a fonte oficial.</p>
          {integration.googleAccountEmail && <p className="text-[12px] text-text-faint truncate mt-1">{integration.googleAccountEmail}</p>}
        </div>
      </div>

      {integration.status === 'not_connected' && <Button icon={Link2} onClick={sheets.connect}>Conectar Google Sheets</Button>}
      {integration.status === 'reauthorization_required' && <Button icon={Link2} onClick={sheets.connect}>Reconectar Google Sheets</Button>}

      {canCreate && (
        <div className="flex flex-col gap-3 rounded-xl bg-surface-2 p-3">
          {integration.status === 'file_missing' && <p className="flex gap-2 text-[12px] text-expense"><AlertCircle size={16} />A planilha anterior não foi encontrada. Você pode criar outra; o arquivo antigo não será excluído pelo Cofre.</p>}
          <Input label="Ano inicial" type="number" min="1900" max={new Date().getFullYear()} value={startYear} onChange={(event) => setStartYear(Number(event.target.value))} />
          <Button disabled={sheets.action === 'creating'} onClick={() => toastAction(() => sheets.createSpreadsheet(startYear), 'Planilha criada')}>{sheets.action === 'creating' ? 'Criando…' : 'Criar planilha do Cofre'}</Button>
        </div>
      )}

      {ready && (
        <>
          <div className="grid gap-2 text-[12px] text-text-muted sm:grid-cols-2">
            <span>Planilha: <strong className="text-text">{integration.spreadsheetName}</strong></span>
            <span>Desde: <strong className="text-text">{integration.startYear}</strong></span>
            <span>Última exportação: <strong className="text-text">{dateTime(integration.lastExportAt)}</strong></span>
            <span>Última importação: <strong className="text-text">{dateTime(integration.lastImportAt)}</strong></span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <a href={integration.spreadsheetUrl} target="_blank" rel="noreferrer" className="focus-ring h-11 rounded-control border border-border bg-surface-3 text-[14px] font-medium flex items-center justify-center gap-2"><ExternalLink size={16} />Abrir planilha</a>
            <Link to={ROUTES.synchronization} className="focus-ring h-11 rounded-control border border-border bg-surface-3 text-[14px] font-medium flex items-center justify-center gap-2"><RefreshCw size={16} />Central de sincronização</Link>
            <Button variant="danger" icon={Unplug} onClick={() => setDisconnectOpen(true)}>Desconectar</Button>
          </div>
        </>
      )}
      {sheets.error && <p role="alert" className="text-[12px] text-expense">{sheets.error}</p>}

      <Dialog open={disconnectOpen} onClose={() => setDisconnectOpen(false)} title="Desconectar Google Sheets?" description="A autorização será revogada, mas a planilha continuará no seu Google Drive." confirmLabel="Desconectar" onConfirm={() => toastAction(sheets.disconnect, 'Integração desconectada')} />
    </div>
  )
}
