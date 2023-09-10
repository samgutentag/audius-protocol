import { useState, useEffect, useRef } from 'react'

import { imageBlank, imageBlank as placeholderArt } from '@audius/common'
import cn from 'classnames'

import ImageSelectionButton from 'components/image-selection/ImageSelectionButton'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import Toast from 'components/toast/Toast'

import styles from './UploadArtwork.module.css'

const messages = {
  imageName: 'Artwork'
}

const UploadArtwork = (props) => {
  const [processing, setProcessing] = useState(false)
  const [showTip, setShowTip] = useState(false)
  const imageSelectionAnchorRef = useRef()

  useEffect(() => {
    if (props.error) {
      setShowTip(true)
      setTimeout(() => {
        setShowTip(false)
      }, 4000)
    }
  }, [props.error])

  const onDrop = async (file, source) => {
    setProcessing(true)
    const image = await file
    await props.onDropArtwork([].concat(image), source)
    setProcessing(false)
  }

  const hasImage = !!props.artworkUrl && props.artworkUrl !== imageBlank

  return (
    <div
      className={cn(
        styles.uploadArtwork,
        {
          [styles.error]: props.error
        },
        props.className
      )}
      ref={imageSelectionAnchorRef}
    >
      <div
        className={styles.artworkWrapper}
        style={{
          backgroundImage: `url(${
            props.artworkUrl || (processing ? '' : placeholderArt)
          })`
        }}
      >
        {processing ? <LoadingSpinner className={styles.overlay} /> : null}
      </div>
      <div className={styles.button}>
        <Toast
          text='No artwork? Pick from our library instead!'
          placement='top'
          fireOnClick={false}
          fillParent={false}
          mount='parent'
          open={showTip}
        >
          <ImageSelectionButton
            anchorRef={imageSelectionAnchorRef}
            defaultPopupOpen={props.defaultPopupOpen}
            imageName={messages.imageName}
            hasImage={hasImage}
            error={props.imageProcessingError}
            onOpenPopup={props.onOpenPopup}
            onClosePopup={props.onClosePopup}
            onRemoveArtwork={props.onRemoveArtwork}
            onSelect={onDrop}
            source='UploadArtwork'
            isImageAutogenerated={props.isImageAutogenerated}
          />
        </Toast>
      </div>
    </div>
  )
}

UploadArtwork.defaultProps = {
  artworkUrl: '',
  mount: 'page'
}

export default UploadArtwork
