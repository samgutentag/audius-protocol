import { useCallback, useContext, useState } from 'react'

import {
  Id,
  Status,
  USDCPurchaseDetails,
  accountSelectors,
  combineStatuses,
  statusIsNotFinalized,
  useAllPaginatedQuery,
  useGetSales,
  useGetSalesCount,
  useUSDCPurchaseDetailsModal
} from '@audius/common'
import { full } from '@audius/sdk'
import { push as pushRoute } from 'connected-react-router'
import { useDispatch } from 'react-redux'

import { useErrorPageOnFailedStatus } from 'hooks/useErrorPageOnFailedStatus'
import { MainContentContext } from 'pages/MainContentContext'
import { audiusBackendInstance } from 'services/audius-backend/audius-backend-instance'
import { audiusSdk } from 'services/audius-sdk'
import { formatToday } from 'utils/dateUtils'
import { useSelector } from 'utils/reducer'
import { UPLOAD_PAGE } from 'utils/route'

import styles from './PayAndEarnPage.module.css'
import { NoTransactionsContent } from './components/NoTransactionsContent'
import {
  SalesTable,
  SalesTableSortDirection,
  SalesTableSortMethod
} from './components/SalesTable'

const { getUserId } = accountSelectors

const messages = {
  pageTitle: 'Sales History',
  pageDescription: 'View your sales history',
  noSalesHeader: `You haven't sold anything yet.`,
  noSalesBody: 'Once you make a sale, it will show up here.',
  upload: 'Upload Track',
  headerText: 'Your Sales',
  downloadCSV: 'Download CSV'
}

const TRANSACTIONS_BATCH_SIZE = 50

const sortMethods: {
  [k in SalesTableSortMethod]: full.GetSalesSortMethodEnum
} = {
  contentId: full.GetSalesSortMethodEnum.ContentTitle,
  createdAt: full.GetSalesSortMethodEnum.Date,
  buyerUserId: full.GetSalesSortMethodEnum.BuyerName
}

const sortDirections: {
  [k in SalesTableSortDirection]: full.GetSalesSortDirectionEnum
} = {
  asc: full.GetSalesSortDirectionEnum.Asc,
  desc: full.GetSalesSortDirectionEnum.Desc
}

const DEFAULT_SORT_METHOD = full.GetSalesSortMethodEnum.Date
const DEFAULT_SORT_DIRECTION = full.GetSalesSortDirectionEnum.Desc

const NoSales = () => {
  const dispatch = useDispatch()
  const handleClickUpload = useCallback(() => {
    dispatch(pushRoute(UPLOAD_PAGE))
  }, [dispatch])
  return (
    <NoTransactionsContent
      headerText={messages.noSalesHeader}
      bodyText={messages.noSalesBody}
      ctaText={messages.upload}
      onCTAClicked={handleClickUpload}
    />
  )
}

export const useSales = () => {
  const userId = useSelector(getUserId)
  // Defaults: sort method = date, sort direction = desc
  const [sortMethod, setSortMethod] =
    useState<full.GetSalesSortMethodEnum>(DEFAULT_SORT_METHOD)
  const [sortDirection, setSortDirection] =
    useState<full.GetSalesSortDirectionEnum>(DEFAULT_SORT_DIRECTION)

  const { onOpen: openDetailsModal } = useUSDCPurchaseDetailsModal()

  const {
    status: dataStatus,
    data: sales,
    hasMore,
    loadMore
  } = useAllPaginatedQuery(
    useGetSales,
    { userId, sortMethod, sortDirection },
    { disabled: !userId, pageSize: TRANSACTIONS_BATCH_SIZE, force: true }
  )

  const { status: countStatus, data: count } = useGetSalesCount(
    { userId },
    { force: true }
  )

  const status = combineStatuses([dataStatus, countStatus])

  useErrorPageOnFailedStatus({ status })

  // TODO: Should fetch users before rendering the table

  const onSort = useCallback(
    (method: SalesTableSortMethod, direction: SalesTableSortDirection) => {
      setSortMethod(sortMethods[method] ?? DEFAULT_SORT_METHOD)
      setSortDirection(sortDirections[direction] ?? DEFAULT_SORT_DIRECTION)
    },
    []
  )

  const fetchMore = useCallback(() => {
    if (hasMore) {
      loadMore()
    }
  }, [hasMore, loadMore])

  const onClickRow = useCallback(
    (purchaseDetails: USDCPurchaseDetails) => {
      openDetailsModal({ variant: 'sale', purchaseDetails })
    },
    [openDetailsModal]
  )

  const isEmpty = status === Status.SUCCESS && sales.length === 0
  const isLoading = statusIsNotFinalized(status)

  const downloadCSV = useCallback(async () => {
    const sdk = await audiusSdk()
    const { data: encodedDataMessage, signature: encodedDataSignature } =
      await audiusBackendInstance.signDiscoveryNodeRequest()
    const blob = await sdk.users.downloadSalesAsCSVBlob({
      id: Id.parse(userId!),
      encodedDataMessage,
      encodedDataSignature
    })
    const blobUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `audius_sales_${formatToday()}.csv`
    a.click()
    window.URL.revokeObjectURL(blobUrl)
  }, [userId])

  return {
    count,
    data: sales,
    fetchMore,
    onSort,
    onClickRow,
    isEmpty,
    isLoading,
    downloadCSV
  }
}
/**
 * Fetches and renders a table of Sales for the currently logged in user
 * */
export const SalesTab = ({
  count,
  data: sales,
  fetchMore,
  onSort,
  onClickRow,
  isEmpty,
  isLoading
}: Omit<ReturnType<typeof useSales>, 'downloadCSV'>) => {
  const { mainContentRef } = useContext(MainContentContext)

  return (
    <div className={styles.container}>
      {isEmpty ? (
        <NoSales />
      ) : (
        <SalesTable
          key='sales'
          data={sales}
          loading={isLoading}
          onSort={onSort}
          onClickRow={onClickRow}
          fetchMore={fetchMore}
          totalRowCount={count}
          isVirtualized={true}
          scrollRef={mainContentRef}
          fetchBatchSize={TRANSACTIONS_BATCH_SIZE}
        />
      )}
    </div>
  )
}
