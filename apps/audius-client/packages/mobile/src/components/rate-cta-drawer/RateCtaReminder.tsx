import { useCallback } from 'react'

import { accountSelectors, FeatureFlags } from '@audius/common'
import { useDispatch, useSelector } from 'react-redux'

import { RATE_CTA_STORAGE_KEY } from 'app/constants/storage-keys'
import { useAsyncStorage } from 'app/hooks/useAsyncStorage'
import { useFeatureFlag } from 'app/hooks/useRemoteConfig'
import useSessionCount from 'app/hooks/useSessionCount'
import { requestReview } from 'app/store/rate-cta/slice'

const getHasAccount = accountSelectors.getHasAccount

const FIRST_REMINDER_SESSION = 3
const REMINDER_FREQUENCY = 5

export const RateCtaReminder = () => {
  const hasAccount = useSelector(getHasAccount)
  const { isEnabled: isRateCtaEnabled } = useFeatureFlag(
    FeatureFlags.RATE_CTA_ENABLED
  )
  const [userRateResponse] = useAsyncStorage(RATE_CTA_STORAGE_KEY, null)

  return isRateCtaEnabled && userRateResponse === null && hasAccount ? (
    <RateCtaReminderInternal />
  ) : null
}

const RateCtaReminderInternal = () => {
  const dispatch = useDispatch()

  const displayReviewCtaDrawer = useCallback(() => {
    dispatch(requestReview())
  }, [dispatch])

  useSessionCount(
    displayReviewCtaDrawer,
    REMINDER_FREQUENCY,
    FIRST_REMINDER_SESSION
  )

  return null
}
