import { faClone, faCheck } from '@fortawesome/pro-light-svg-icons'

import { autorun } from 'mobx'
import { Observer } from 'mobx-react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { InboxController } from 'src/bills/application/pages/inbox/list/Inbox.controller'
import { HttpInboxRepository } from 'src/bills/data/repositories/HttpInboxRepository'
import {
  BodyTextSM,
  Container,
  Counter,
  HeadingMD,
  Icon,
  Loading,
  Padding,
  PaddingInsets,
  Row,
  Spacing,
  Tabs,
  Toast,
  Toaster,
  Tooltip
} from 'src/everest/everest.components'
import { InboxDetails } from '../details'
import { useInboxSimpleDetails } from '../details/hooks/useInboxSimpleDetails'
import { FiltersSection, InboxSection } from './components/InboxSection'
import { defineColumnsSpecs } from './components/defineColumnsSpecs'

declare const inboxEmail: string | undefined

export const InboxPage = () => {
  const email = typeof inboxEmail === 'undefined' ? '' : inboxEmail

  const controller = useMemo(
    () => new InboxController(new HttpInboxRepository()),
    []
  )
  const [inboxRowSelection, setInboxRowSelection] = useState({})
  const [archivedRowSelection, setArchivedRowSelection] = useState({})
  const [currentTab, setCurrentTab] = useState('inbox')

  const {
    clickedEmail,
    handleEmailClick,
    isDetailsOpen,
    toggleDetails,
    closeDetails
  } = useInboxSimpleDetails()

  autorun(() => {
    if (controller.hasConnectionError) {
      Toaster.show({
        message:
          'Não conseguimos estabelecer conexão. Tente novamente em instantes ou atualize seu navegador.',
        state: 'error',
        duration: 30000
      })
    }

    if (controller.hasUnexpectedError) {
      Toaster.show({
        message:
          'Ops, ocorreu um erro inesperado. Por favor, tente novamente mais tarde.',
        state: 'error',
        duration: 30000
      })
    }
  })

  useEffect(() => {
    window.document.title = 'Inbox | Kamino'
    async function fetch (): Promise<void> {
      await controller.getFirstPage()
    }

    void fetch()

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()

        closeDetails()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller])

  const inboxColumns = defineColumnsSpecs({ isDetailsClosed: isDetailsOpen })
  const archivedColumns = defineColumnsSpecs({
    isDetailsClosed: isDetailsOpen
  })

  const [isEmailCopied, setIsEmailCopied] = useState(false)

  function buildInboxTab () {
    return {
      id: 'inbox',
      labelChildren: (
        <Counter
          count={controller.inboxPagination.totalRows}
          color={'highlight'}
        />
      ),
      content: (
        <div>
          <Spacing top={'xxs'} />
          <InboxSection
            columns={inboxColumns}
            rowSelectionState={inboxRowSelection}
            onRowSelectionChange={setInboxRowSelection}
            onItemClick={handleEmailClick}
            onPageChange={({ selected }: { selected: number }) => {
              void controller.getInboxPageBy({
                number: selected + 1
              })
            }}
            currentPage={controller.getCurrentPageFrom(
              controller.inboxPagination
            )}
            isLoadingFirstPage={controller.isLoadingFirstPage}
            isLoadingPage={controller.isLoadingInboxPage}
            totalPages={controller.inboxPagination.totalPages}
            currentPageIndex={controller.inboxPagination.currentPage - 1}
          />
        </div>
      ),
      label: 'Entrada',
      value: 'inbox',
      tabsRowContent: (
        <FiltersSection
          byDaysFilter={{
            currentDays: controller.byDaysFilters,
            type: 'inbox',
            onClickFilterByDays: (days, type) => {
              void controller.filterByDays({
                days,
                type
              })
            }
          }}
          onFilterByPeriod={(startDate, endDate) => {
            controller.byDaysFilters = undefined
            void controller.filterByPeriod({
              initial: startDate,
              final: endDate,
              type: 'inbox'
            })
          }}
          onClearFilterByPeriod={() => {
            void controller.clearFilterByPeriod('inbox')
          }}
          periodFilter={
            controller.periodFilters
              ? {
                  startDate: controller.periodFilters.initial,
                  endDate: controller.periodFilters.final
                }
              : undefined
          }
        />
      )
    }
  }

  function buildArchivedTab () {
    return {
      id: 'archived',
      content: (
        <div>
          <Spacing top={'xxs'} />
          <InboxSection
            columns={archivedColumns}
            rowSelectionState={archivedRowSelection}
            onRowSelectionChange={setArchivedRowSelection}
            onItemClick={handleEmailClick}
            onPageChange={({ selected }: { selected: number }) => {
              void controller.getArchivedPageBy({
                number: selected + 1
              })
            }}
            currentPage={controller.getCurrentPageFrom(
              controller.archivedPagination
            )}
            isLoadingFirstPage={controller.isLoadingFirstPage}
            isLoadingPage={controller.isLoadingArchivedPage}
            totalPages={controller.archivedPagination.totalPages}
            currentPageIndex={controller.archivedPagination.currentPage - 1}
          />
        </div>
      ),
      label: 'Arquivados',
      value: 'archived',
      tabsRowContent: (
        <FiltersSection
          byDaysFilter={{
            currentDays: controller.archivedByDaysFilters,
            type: 'archived',
            onClickFilterByDays: (days, type) => {
              void controller.filterByDays({
                days,
                type
              })
            }
          }}
          onFilterByPeriod={(startDate, endDate) => {
            controller.archivedByDaysFilters = undefined
            void controller.filterByPeriod({
              initial: startDate,
              final: endDate,
              type: 'archived'
            })
          }}
          onClearFilterByPeriod={() => {
            void controller.clearFilterByPeriod('archived')
          }}
          periodFilter={
            controller.periodArchivedFilters
              ? {
                  startDate: controller.periodArchivedFilters.initial,
                  endDate: controller.periodArchivedFilters.final
                }
              : undefined
          }
        />
      )
    }
  }

  return (
    <Observer>
      {() => (
        <Suspense>
          {controller.isLoadingFirstPage && <Loading fullpage />}
          {!controller.isLoadingFirstPage && (
            <div>
              <InboxDetails
                clickedInboxEmail={clickedEmail}
                open={isDetailsOpen}
                toggle={toggleDetails}
              />
              <Container fluid>
                <Row justify="start">
                  <Padding padding={PaddingInsets.only({ bottom: 27 })}>
                    <HeadingMD color="primaryBrand" weight="extraBold">
                      Caixa de entrada
                    </HeadingMD>
                    {email !== '' && (
                      <Padding padding={PaddingInsets.only({ top: 3 })}>
                        <Row
                          align={'center'}
                          justify={'start'}
                          fullwidth={false}
                        >
                          <BodyTextSM color={'neutralC'} weight={'regular'}>
                            {email}
                          </BodyTextSM>
                          <Spacing right={'nano'} />
                          <Tooltip content={'Copiar'}>
                            {!isEmailCopied
                              ? (
                              <Icon
                                icon={faClone}
                                area={24}
                                size={16}
                                color={'neutralB'}
                                style={{ cursor: 'pointer' }}
                                onClick={() => {
                                  void navigator.clipboard
                                    .writeText(email)
                                    .then(() => {
                                      setIsEmailCopied(true)
                                      setTimeout(() => {
                                        setIsEmailCopied(false)
                                      }, 2500)
                                    })
                                }}
                              />
                                )
                              : (
                              <Icon
                                icon={faCheck}
                                area={24}
                                size={16}
                                color={'mediumGreen'}
                              />
                                )}
                          </Tooltip>
                        </Row>
                      </Padding>
                    )}
                  </Padding>
                </Row>
              </Container>
              <Container fluid>
                <Row justify="start">
                  <Tabs
                    value={currentTab}
                    onValueChange={setCurrentTab}
                    tabs={[buildInboxTab(), buildArchivedTab()]}
                  />
                </Row>
              </Container>
            </div>
          )}
          <Toast />
        </Suspense>
      )}
    </Observer>
  )
}
