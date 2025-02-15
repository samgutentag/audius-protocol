import { useEffect } from 'react'

import {
  getPathFromTrackUrl,
  useGetTrackByPermalink,
  accountSelectors,
  usePremiumContentAccess,
  isPremiumContentUSDCPurchaseGated,
  isPremiumContentCollectibleGated
} from '@audius/common'
import { useField } from 'formik'
import { useSelector } from 'react-redux'
import { useThrottle } from 'react-use'

import { Divider } from 'components/divider'
import { TextField } from 'components/form-fields'
import { HelpCallout } from 'components/help-callout/HelpCallout'

import { IS_PREMIUM, PREMIUM_CONDITIONS } from '../AccessAndSaleField'
import { SwitchRowField } from '../SwitchRowField'

import styles from './RemixSettingsField.module.css'
import { TrackInfo } from './TrackInfo'
import { CAN_REMIX_PARENT, IS_REMIX, REMIX_LINK, SHOW_REMIXES } from './types'
const { getUserId } = accountSelectors

const messages = {
  hideRemix: {
    header: 'Hide Remixes of This Track',
    description:
      'Enable this option if you want to prevent remixes of your track by other artists from appearing on your track page.'
  },
  remixOf: {
    header: 'Identify as Remix',
    description:
      "Paste the original Audius track link if yours is a remix. Your remix will typically appear on the original track's page.",
    linkLabel: 'Link to Remix'
  },
  changeAvailabilityPrefix: 'Availablity is set to ',
  changeAvailabilitySuffix:
    '. To enable these options, change availability to Public.',
  premium: 'Premium (Pay-to-Unlock)',
  collectibleGated: 'Collectible Gated',
  specialAccess: 'Special Access'
}

export const RemixSettingsMenuFields = () => {
  const [{ value: isPremium }] = useField(IS_PREMIUM)
  const [{ value: premiumConditions }] = useField(PREMIUM_CONDITIONS)
  const [{ value: trackUrl }] = useField(REMIX_LINK)
  const [, , { setValue: setCanRemixParent }] = useField(CAN_REMIX_PARENT)
  const permalink = useThrottle(getPathFromTrackUrl(trackUrl), 1000)
  const currentUserId = useSelector(getUserId)

  const { data: track } = useGetTrackByPermalink(
    { permalink, currentUserId },
    { disabled: !permalink }
  )

  const trackId = track?.track_id
  const { doesUserHaveAccess: canRemixParent } = usePremiumContentAccess(
    track ?? null
  )

  const [, , { setValue: setParentTrackId }] = useField('parentTrackId')

  useEffect(() => {
    setParentTrackId(trackId)
    setCanRemixParent(canRemixParent)
  }, [trackId, setParentTrackId, canRemixParent, setCanRemixParent])

  const renderHideRemixesField = () => {
    if (isPremium) {
      return (
        <SwitchRowField
          name={SHOW_REMIXES}
          header={messages.hideRemix.header}
          description={messages.hideRemix.description}
          inverted={false}
          checked
          disabled
        />
      )
    }
    return (
      <SwitchRowField
        name={SHOW_REMIXES}
        header={messages.hideRemix.header}
        description={messages.hideRemix.description}
        inverted
      />
    )
  }

  return (
    <div className={styles.fields}>
      {isPremium ? (
        <HelpCallout
          content={`${messages.changeAvailabilityPrefix} ${
            isPremiumContentUSDCPurchaseGated(premiumConditions)
              ? messages.premium
              : isPremiumContentCollectibleGated(premiumConditions)
              ? messages.collectibleGated
              : messages.specialAccess
          }${messages.changeAvailabilitySuffix}`}
        />
      ) : null}
      {renderHideRemixesField()}
      <Divider />
      <SwitchRowField
        name={IS_REMIX}
        header={messages.remixOf.header}
        description={messages.remixOf.description}
        disabled={isPremium}
      >
        <TextField name={REMIX_LINK} label={messages.remixOf.linkLabel} />
        {track ? <TrackInfo trackId={track.track_id} /> : null}
      </SwitchRowField>
    </div>
  )
}
