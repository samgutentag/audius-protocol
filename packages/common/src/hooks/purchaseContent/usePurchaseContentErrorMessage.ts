import { BuyCryptoErrorCode } from 'store/buy-crypto/types'
import { BuyUSDCErrorCode } from 'store/index'
import {
  PurchaseContentErrorCode,
  PurchaseErrorCode
} from 'store/purchase-content'
import { formatPrice } from 'utils/formatUtil'

import { RemoteVarHook } from '../useRemoteVar'

import { useUSDCPurchaseConfig } from './useUSDCPurchaseConfig'

const messages = {
  generic: 'Your purchase was unsuccessful.',
  minimumPurchase: (minAmount: number) =>
    `Total purchase amount must be at least $${formatPrice(minAmount)}.`,
  maximumPurchase: (maxAmount: number) =>
    `Total purchase amount may not exceed $${formatPrice(maxAmount)}.`,
  badAmount: (minAmount: number, maxAmount: number) =>
    `Total purchase amount must be between $${formatPrice(
      minAmount
    )} and ${formatPrice(maxAmount)}`,
  countryNotSupported:
    'Stripe is unable to support transactions in this country'
}

export const usePurchaseContentErrorMessage = (
  errorCode: PurchaseContentErrorCode,
  useRemoteVar: RemoteVarHook
) => {
  const { minUSDCPurchaseAmountCents, maxUSDCPurchaseAmountCents } =
    useUSDCPurchaseConfig(useRemoteVar)

  switch (errorCode) {
    case BuyUSDCErrorCode.MinAmountNotMet:
      return messages.minimumPurchase(minUSDCPurchaseAmountCents)
    case BuyUSDCErrorCode.MaxAmountExceeded:
      return messages.maximumPurchase(maxUSDCPurchaseAmountCents)
    case BuyCryptoErrorCode.COUNTRY_NOT_SUPPORTED:
    case BuyUSDCErrorCode.CountryNotSupported:
      return messages.countryNotSupported
    case BuyCryptoErrorCode.BAD_AMOUNT:
      return messages.badAmount(
        minUSDCPurchaseAmountCents,
        maxUSDCPurchaseAmountCents
      )
    case BuyCryptoErrorCode.BAD_FEE_PAYER:
    case BuyCryptoErrorCode.BAD_PROVIDER:
    case BuyCryptoErrorCode.BAD_TOKEN:
    case BuyCryptoErrorCode.ON_RAMP_ERROR:
    case BuyCryptoErrorCode.SWAP_ERROR:
    case BuyCryptoErrorCode.UNKNOWN:
    case BuyUSDCErrorCode.OnrampError:
    case PurchaseErrorCode.Unknown:
      return messages.generic
  }
}
