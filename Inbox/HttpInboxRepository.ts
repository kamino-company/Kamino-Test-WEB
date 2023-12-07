import { Situation } from 'src/bills/domain/repositories/Inbox.repository'
import { HttpError, UnexpectedError } from 'src/shared'
import { getDefaultHttpClient } from 'src/shared/http'
import mapInboxResponseToInboxDomainModel from './mappers/Inbox.mapper'
import type { GenericResponse } from './responses/GenericResponse'
import type { InboxPaginacao } from './responses/Inbox.response'
import type { AxiosResponse } from 'axios'
import type { InboxEmail } from 'src/bills/domain/model/inbox/InboxEmail'
import type { InboxPagination } from 'src/bills/domain/model/inbox/InboxPagination'
import type { InboxRepository, Params } from 'src/bills/domain/repositories/Inbox.repository'

export class HttpInboxRepository implements InboxRepository {
  public async getInbox (byQuery?: Params): Promise<InboxPagination> {
    return await this.getFrom('/api/financeiro/pagamento/inbox/lista', {
      includeArchived: false,
      ...byQuery
    })
  }

  public async getArchived (byQuery?: Params): Promise<InboxPagination> {
    return await this.getFrom('/api/financeiro/pagamento/inbox/lista', {
      situation: Situation.Archived.valueOf(),
      ...byQuery
    })
  }

  private async getFrom (
    path: string,
    byQuery?: Params
  ): Promise<InboxPagination> {
    const client = getDefaultHttpClient()
    let result: AxiosResponse<InboxPaginacao>

    try {
      result = await client.get<InboxPaginacao>(path, {
        params: {
          _pagina: byQuery?.page ?? 1,
          _tamanhoPagina: byQuery?.pageSize ?? 10,
          IncluirArquivados: byQuery?.includeArchived,
          PeriodoDe: byQuery?.period?.initial,
          PeriodoAte: byQuery?.period?.final,
          ID: byQuery?.id,
          Pasta: byQuery?.folderName,
          VencimentoDe: byQuery?.dueDatePeriod?.initialDueDate,
          VencimentoAte: byQuery?.dueDatePeriod?.finalDueDate,
          Situacoes: byQuery?.situation
        }
      })
      return mapInboxResponseToInboxDomainModel(result.data)
    } catch (error) {
      throw new UnexpectedError({
        message: error instanceof Error
          ? error.message
          : 'Could not correctly map response entity',
        cause: error
      })
    }
  }

  public async archive (inboxEmail: InboxEmail): Promise<void> {
    let result: GenericResponse
    try {
      result = (await getDefaultHttpClient().post(`api/financeiro/pagamento/inbox/${inboxEmail.id}/arquivar`)).data
    } catch (error) {
      if (error instanceof HttpError) {
        throw error
      }

      throw new UnexpectedError({
        message: 'Ops! Ocorreu um erro ao arquivar o e-mail, tente novamente mais tarde.',
        cause: error
      })
    }

    if (!result.Sucesso) {
      throw new UnexpectedError({
        message: result.Mensagem ?? 'Ops! Ocorreu um erro ao arquivar o e-mail, tente novamente mais tarde.',
        info: result.InfoAdicional,
        cause: result
      })
    }
  }

  public async unarchive (inboxEmail: InboxEmail): Promise<void> {
    let result: GenericResponse
    try {
      result = (await getDefaultHttpClient().post(`api/financeiro/pagamento/inbox/${inboxEmail.id}/desarquiva`)).data
    } catch (error) {
      if (error instanceof HttpError) {
        throw error
      }

      throw new UnexpectedError({
        message: 'Ops! Ocorreu um erro ao desarquivar o e-mail, tente novamente mais tarde.',
        cause: error
      })
    }

    if (!result.Sucesso) {
      throw new UnexpectedError({
        message: result.Mensagem ?? 'Ops! Ocorreu um erro ao desarquivar o e-mail, tente novamente mais tarde.',
        info: result.InfoAdicional,
        cause: result
      })
    }
  }

  public async markAsSpam (inboxEmail: InboxEmail): Promise<void> {
    let result: GenericResponse
    try {
      result = (await getDefaultHttpClient().post(`api/financeiro/pagamento/inbox/${inboxEmail.id}/spam`)).data
    } catch (error) {
      if (error instanceof HttpError) {
        throw error
      }

      throw new UnexpectedError({
        message: 'Ops! Ocorreu um erro ao marcar o e-mail como spam, tente novamente mais tarde.',
        cause: error
      })
    }

    if (!result.Sucesso) {
      throw new UnexpectedError({
        message: result.Mensagem ?? 'Ops! Ocorreu um erro ao marcar o e-mail como spam, tente novamente mais tarde.',
        info: result.InfoAdicional,
        cause: result
      })
    }
  }
}
