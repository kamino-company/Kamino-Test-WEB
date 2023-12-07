import { makeAutoObservable } from 'mobx'
import { pubsub } from 'src/shared'
import { HttpError, NetworkConnectionError } from 'src/shared/http'
import { inboxEmailChannel } from '../details/events/InboxEmailChangedEvent'
import type { EventType, InboxEmailChangedEvent } from '../details/events/InboxEmailChangedEvent'
import type { InboxEmail } from 'src/bills/domain/model/inbox/InboxEmail'
import type { InboxPagination } from 'src/bills/domain/model/inbox/InboxPagination'
import type {
  InboxRepository,
  Period
} from 'src/bills/domain/repositories/Inbox.repository'

export class InboxController {
  inboxPagination!: InboxPagination
  archivedPagination!: InboxPagination
  isLoadingFirstPage: boolean = true
  isLoadingInboxPage: boolean = false
  isLoadingArchivedPage: boolean = false
  hasUnexpectedError: boolean = false
  hasConnectionError: boolean = false
  byDaysFilters?: number
  periodFilters?: Period
  archivedByDaysFilters?: number
  periodArchivedFilters?: Period

  constructor (private readonly inboxRepository: InboxRepository) {
    makeAutoObservable(this)
    pubsub.subscribe({
      channel: inboxEmailChannel,
      listener: (data) => {
        const result = data as InboxEmailChangedEvent
        this.handleInboxEmailChanged({ inboxEmail: result.email, event: result.event })
      }
    })
  }

  public async getFirstPage (): Promise<void> {
    this.isLoadingFirstPage = true

    await Promise.all<InboxPagination>([
      this.inboxRepository.getInbox(),
      this.inboxRepository.getArchived()
    ])
      .then((results) => {
        this.inboxPagination = results[0]
        this.archivedPagination = results[1]
      })
      .catch((errors: Error[]) => {
        errors.forEach((error: Error) => {
          this.handleErrors(error)
        })
        this.hasUnexpectedError = true
      })
      .finally(() => {
        this.isLoadingFirstPage = false
      })
  }

  public async filterByPeriod ({
    initial,
    final,
    type
  }: Period & { type: 'inbox' | 'archived' }): Promise<void> {
    if (this.isLoadingInboxPage || this.isLoadingArchivedPage) {
      return
    }

    if (type === 'inbox') {
      this.isLoadingInboxPage = true
      this.inboxRepository
        .getInbox({ period: { initial, final } })
        .then((result) => {
          this.inboxPagination = result
          this.periodFilters = { initial, final }
        })
        .catch(this.handleErrors)
        .finally(() => {
          this.isLoadingInboxPage = false
        })
    } else {
      this.isLoadingArchivedPage = true
      this.inboxRepository
        .getArchived({ period: { initial, final } })
        .then((result) => {
          this.archivedPagination = result
          this.periodArchivedFilters = { initial, final }
        })
        .catch(this.handleErrors)
        .finally(() => {
          this.isLoadingArchivedPage = false
        })
    }
  }

  public async clearFilterByPeriod (type: 'inbox' | 'archived'): Promise<void> {
    if (type === 'inbox') {
      this.periodFilters = undefined
    } else {
      this.periodArchivedFilters = undefined
    }
    if (type === 'inbox') {
      void this.getInboxPageBy({ number: 1 })
    } else {
      void this.getArchivedPageBy({ number: 1 })
    }
  }

  public async filterByDays (data: {
    days: number
    type: 'inbox' | 'archived'
  }): Promise<void> {
    const { days, type } = data
    if (type === 'inbox') {
      await this.filterInboxByDays(days)
    } else if (type === 'archived') {
      await this.filterArchivedByDays(days)
    }
  }

  private async filterInboxByDays (days: number): Promise<void> {
    if (this.byDaysFilters === days) {
      this.byDaysFilters = undefined
      this.periodFilters = undefined
      await this.getInboxPageBy({ number: 1 })
      return
    }

    this.byDaysFilters = days
    this.periodFilters = undefined
    const date = new Date()
    date.setDate(date.getDate() - days)
    await this.filterByPeriod({
      initial: date,
      final: new Date(),
      type: 'inbox'
    })
  }

  private async filterArchivedByDays (days: number): Promise<void> {
    if (this.archivedByDaysFilters === days) {
      this.archivedByDaysFilters = undefined
      this.periodArchivedFilters = undefined
      await this.getArchivedPageBy({ number: 1 })
      return
    }

    this.archivedByDaysFilters = days
    this.periodArchivedFilters = undefined
    const date = new Date()
    date.setDate(date.getDate() - days)
    await this.filterByPeriod({
      initial: date,
      final: new Date(),
      type: 'archived'
    })
  }

  public async getInboxPageBy ({ number }: { number: number }): Promise<void> {
    this.isLoadingInboxPage = true

    this.inboxRepository
      .getInbox({ page: number, period: this.periodFilters })
      .then((result) => {
        this.inboxPagination = result
      })
      .catch(this.handleErrors)
      .finally(() => {
        this.isLoadingInboxPage = false
      })
  }

  public async getArchivedPageBy ({
    number
  }: {
    number: number
  }): Promise<void> {
    this.isLoadingArchivedPage = true
    this.inboxRepository
      .getArchived({ page: number, period: this.periodArchivedFilters })
      .then((result) => {
        this.archivedPagination = result
      })
      .catch(this.handleErrors)
      .finally(() => {
        this.isLoadingArchivedPage = false
      })
  }

  private handleErrors (error: Error) {
    if (error instanceof NetworkConnectionError) {
      this.hasConnectionError = true
      return
    } else if (error instanceof HttpError) {
      this.hasUnexpectedError = true
      return
    }
    this.hasUnexpectedError = true
  }

  public getCurrentPageFrom (pagination: InboxPagination): InboxEmail[] {
    const currentPage = pagination.inboxPages.find(
      (item) => item.pageNumber === pagination.currentPage
    )?.inboxEmails

    if (currentPage === undefined) {
      throw new Error('Invalid page number')
    }

    return currentPage
  }

  public handleInboxEmailChanged (_: { inboxEmail: InboxEmail, event: EventType }): void {
    if (this.inboxPagination && this.archivedPagination) {
      if (
        this.inboxPagination.currentPage === this.inboxPagination.totalPages &&
          this.inboxPagination.currentPage > 1 &&
          this.getCurrentPageFrom(this.inboxPagination).length === 1
      ) {
        void this.getInboxPageBy({ number: this.inboxPagination.currentPage - 1 })
      } else {
        void this.getInboxPageBy({ number: this.inboxPagination.currentPage })
      }

      if (
        this.archivedPagination.currentPage === this.archivedPagination.totalPages &&
          this.archivedPagination.currentPage > 1 &&
          this.getCurrentPageFrom(this.archivedPagination).length === 1
      ) {
        void this.getArchivedPageBy({ number: this.archivedPagination.currentPage - 1 })
      } else {
        void this.getArchivedPageBy({ number: this.archivedPagination.currentPage })
      }
    }
  }
}
