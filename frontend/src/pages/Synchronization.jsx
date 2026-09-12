import { AlertCircle, CheckCircle2, Clock3, FileWarning, RefreshCw, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import Header from '@/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { ROUTES } from '@/constants/routes'
import { useToast } from '@/contexts/ToastContext'
import { useGoogleSheetsSync } from '@/hooks/useGoogleSheetsSync'
import { isDemoMode } from '@/config/appMode'

const statusMeta = {
  running: { label: 'Em andamento', icon: RefreshCw, color: 'text-income' },
  success: { label: 'Concluída', icon: CheckCircle2, color: 'text-income' },
  conflicts: { label: 'Requer atenção', icon: FileWarning, color: 'text-expense' },
  failed: { label: 'Falhou', icon: XCircle, color: 'text-expense' },
}

function dateTime(value) {
  return value ? new Date(`${value.replace(' ', 'T')}Z`).toLocaleString('pt-BR') : 'Nunca'
}

function RunSummary({ run, compact = false }) {
  if (!run) return <p className="text-[13px] text-text-muted">Nenhuma sincronização realizada.</p>
  const meta = statusMeta[run.status] || statusMeta.failed
  const Icon = meta.icon
  const issues = [...(run.details?.invalid || []), ...(run.details?.conflicts || [])]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon size={17} className={`${meta.color} ${run.status === 'running' ? 'animate-spin' : ''}`} />
          <div>
            <p className="text-[13px] font-medium">{meta.label}</p>
            <p className="text-[11px] text-text-faint">{dateTime(run.startedAt)}</p>
          </div>
        </div>
        <span className="text-[11px] text-text-faint">#{run.id}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
        <span className="text-text-muted">Lidos <strong className="block text-text">{run.recordsRead}</strong></span>
        <span className="text-text-muted">Importados <strong className="block text-text">{run.recordsImported}</strong></span>
        <span className="text-text-muted">Exportados <strong className="block text-text">{run.recordsExported}</strong></span>
        <span className="text-text-muted">Problemas <strong className="block text-text">{run.conflictCount + run.invalidCount}</strong></span>
      </div>

      {run.error && <p className="flex gap-2 text-[12px] text-expense"><AlertCircle size={15} className="shrink-0" />{run.error.message}</p>}
      {compact && issues.length > 0 && (
        <details className="text-[11px] text-text-faint">
          <summary className="cursor-pointer text-text-muted">Ver detalhes dos problemas</summary>
          <div className="mt-2 flex flex-col gap-1">
            {issues.slice(0, 5).map((issue, index) => <p key={`${issue.rowNumber || 'issue'}-${index}`}>Linha {issue.rowNumber || '?'}: {issue.reason || issue.errors?.join(' ')}</p>)}
            {issues.length > 5 && <p>E mais {issues.length - 5} ocorrência(s).</p>}
            {run.details?.truncated && <p>O histórico preserva apenas as primeiras ocorrências.</p>}
          </div>
        </details>
      )}
      {!compact && issues.slice(0, 5).map((issue, index) => (
        <p key={`${issue.rowNumber || 'issue'}-${index}`} className="text-[11px] text-text-faint">
          Linha {issue.rowNumber || '?'}: {issue.reason || issue.errors?.join(' ')}
        </p>
      ))}
      {!compact && issues.length > 5 && <p className="text-[11px] text-text-faint">E mais {issues.length - 5} ocorrência(s).</p>}
      {!compact && run.details?.truncated && <p className="text-[11px] text-text-faint">O histórico preserva somente as primeiras ocorrências; os totais acima permanecem completos.</p>}
    </div>
  )
}

export default function Synchronization() {
  return isDemoMode ? <DemoSynchronization /> : <ProductionSynchronization />
}

function DemoSynchronization() {
  return (
    <div>
      <Header title="Sincronização" subtitle="Integrações externas do Cofre" />
      <div className="max-w-[760px] px-5 pb-8 md:px-8">
        <Card className="flex flex-col items-start gap-3 p-5">
          <FileWarning size={24} className="text-info" />
          <div>
            <h2 className="text-[15px] font-semibold text-text">Google Sheets desativado na demonstração</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-text-muted">A versão de produção possui sincronização manual, histórico, conflitos e tratamento de falhas. Esta demonstração não solicita permissões Google e não envia dados para serviços externos.</p>
          </div>
          <Link to={ROUTES.settings} className="focus-ring rounded-control border border-border bg-surface-2 px-4 py-2 text-[13px] font-medium text-text">Ver detalhes nos ajustes</Link>
        </Card>
      </div>
    </div>
  )
}

function ProductionSynchronization() {
  const { showToast } = useToast()
  const sync = useGoogleSheetsSync()
  const running = sync.status?.latest?.status === 'running'

  const synchronize = async () => {
    try {
      const result = await sync.synchronize()
      if (result.status === 'conflicts') showToast('A planilha possui conflitos que precisam ser corrigidos.', 'error')
      else showToast(result.idempotentReplay ? 'Esta operação já havia sido processada.' : 'Sincronização concluída', 'success')
    } catch (error) {
      showToast(error.message || 'Não foi possível sincronizar.', 'error')
    }
  }

  return (
    <div>
      <Header title="Sincronização" subtitle="Google Sheets e Cofre em um fluxo controlado" />
      <div className="px-5 md:px-8 pb-8 max-w-[760px] flex flex-col gap-5">
        <Card className="p-4 md:p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-medium">Sincronização manual</p>
              <p className="text-[12px] text-text-muted mt-1">Linhas novas são importadas; conflitos interrompem a operação. Depois, o estado consolidado do Cofre é exportado.</p>
            </div>
            <button onClick={() => sync.refresh().catch(() => {})} className="focus-ring rounded-control p-2 text-text-muted hover:bg-surface-2" aria-label="Atualizar estado"><RefreshCw size={16} /></button>
          </div>

          {sync.loading ? <p className="text-[13px] text-text-muted">Consultando sincronização…</p> : sync.status?.ready ? (
            <Button icon={RefreshCw} disabled={sync.syncing || running} onClick={synchronize}>
              {sync.syncing || running ? 'Sincronizando…' : 'Sincronizar agora'}
            </Button>
          ) : (
            <div className="rounded-xl bg-surface-2 p-3 text-[12px] text-text-muted">
              A integração Google Sheets não está pronta. <Link to={ROUTES.settings} className="text-income hover:underline">Abrir ajustes</Link>
            </div>
          )}
          {sync.error && <p role="alert" className="text-[12px] text-expense">{sync.error}</p>}
        </Card>

        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-muted">Última sincronização</h2>
          <Card className="p-4 md:p-5"><RunSummary run={sync.status?.latest} /></Card>
        </div>

        <div>
          <div className="mb-3 flex items-center gap-2 text-text-muted"><Clock3 size={15} /><h2 className="text-[13px] font-semibold uppercase tracking-wide">Histórico</h2></div>
          <div className="flex flex-col gap-3">
            {sync.history.length === 0 ? <Card className="p-4"><p className="text-[13px] text-text-muted">O histórico aparecerá após a primeira sincronização.</p></Card> : sync.history.map((run) => (
              <Card key={run.id} className="p-4"><RunSummary run={run} compact /></Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
