import { useCallback } from 'react'

import {
  Name,
  ButtonState,
  useDownloadTrackButtons,
  tracksSocialActions
} from '@audius/common'
import type { ID, ButtonType as DownloadButtonType } from '@audius/common'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import IconDownload from 'app/assets/images/iconDownload.svg'
import { Button } from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import { useToast } from 'app/hooks/useToast'
import { make, track } from 'app/services/analytics'
import { makeStyles } from 'app/styles'
const { downloadTrack } = tracksSocialActions

export type DownloadButtonProps = {
  state: ButtonState
  type: DownloadButtonType
  label: string
  doesUserHaveAccess: boolean
  onClick?: () => void
}

export const messages = {
  followToDownload: 'Must follow artist to download',
  addDownloadPrefix: (label: string) => `Download ${label}`,
  mustHaveAccess: 'Must have access to download'
}

const useStyles = makeStyles(() => ({
  buttonContainer: {
    alignSelf: 'center',
    marginBottom: 6
  }
}))

const DownloadButton = ({
  label,
  state,
  doesUserHaveAccess,
  onClick = () => {}
}: DownloadButtonProps) => {
  const { toast } = useToast()

  const styles = useStyles()
  const requiresFollow = state === ButtonState.REQUIRES_FOLLOW
  const isProcessing = state === ButtonState.PROCESSING
  const isDisabled =
    !doesUserHaveAccess || state === ButtonState.PROCESSING || requiresFollow

  const handlePress = useCallback(() => {
    if (requiresFollow) {
      toast({ content: messages.followToDownload })
    }

    if (!doesUserHaveAccess) {
      toast({ content: messages.mustHaveAccess })
    }

    if (isDisabled) {
      return
    }

    onClick()
  }, [isDisabled, onClick, requiresFollow, doesUserHaveAccess, toast])

  // Manually handling disabled state in order to show a toast
  // when a follow is required
  return (
    <Button
      variant='common'
      icon={isProcessing ? LoadingSpinner : IconDownload}
      iconPosition='left'
      title={messages.addDownloadPrefix(label)}
      styles={{
        root: styles.buttonContainer,
        button: isDisabled && { opacity: 0.5 }
      }}
      onPress={handlePress}
      size='small'
    />
  )
}

type TrackScreenDownloadButtonsProps = {
  following: boolean
  doesUserHaveAccess: boolean
  isHidden?: boolean
  isOwner: boolean
  trackId: ID
}

export const TrackScreenDownloadButtons = ({
  following,
  doesUserHaveAccess,
  isOwner,
  trackId
}: TrackScreenDownloadButtonsProps) => {
  const dispatch = useDispatch()

  const handleDownload = useCallback(
    (id: ID, category?: string, parentTrackId?: ID) => {
      dispatch(downloadTrack(id, category))
      track(
        make({
          eventName: Name.TRACK_PAGE_DOWNLOAD,
          id,
          category,
          parent_track_id: parentTrackId
        })
      )
    },
    [dispatch]
  )

  const buttons = useDownloadTrackButtons({
    trackId,
    onDownload: handleDownload,
    isOwner,
    following,
    useSelector
  })

  const shouldHide = buttons.length === 0
  if (shouldHide) {
    return null
  }

  return (
    <View style={{ marginBottom: 12 }}>
      {buttons.map((props) => (
        <DownloadButton
          {...props}
          doesUserHaveAccess={doesUserHaveAccess}
          key={props.label}
        />
      ))}
    </View>
  )
}
