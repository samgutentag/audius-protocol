import { useCallback } from 'react'

import { useLeavingAudiusModal } from '@audius/common'
import { Button, ButtonType } from '@audius/harmony'
import {
  IconExternalLink,
  IconInfo,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle
} from '@audius/stems'

import { Icon } from 'components/Icon'
import { Text } from 'components/typography'

import { HelpCallout } from '../help-callout/HelpCallout'

import styles from './LeavingAudiusModal.module.css'

const messages = {
  title: 'Are You Sure?',
  body: 'This link is taking you to the following website',
  goBack: 'Go Back',
  visitSite: 'Visit Site'
}

export const LeavingAudiusModal = () => {
  const { isOpen, data, onClose, onClosed } = useLeavingAudiusModal()
  const { link } = data
  const handleOpen = useCallback(() => {
    window.open(link, '_blank', 'noreferrer,noopener')
    onClose()
  }, [link, onClose])
  return (
    <Modal
      bodyClassName={styles.modalBody}
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClosed}
      size={'small'}
    >
      <ModalHeader>
        <ModalTitle
          iconClassName={styles.icon}
          icon={<Icon icon={IconInfo} />}
          title={messages.title}
        />
      </ModalHeader>
      <ModalContent className={styles.content}>
        <Text>{messages.body}</Text>
        <HelpCallout
          className={styles.hint}
          contentClassName={styles.hintContent}
          icon={<IconExternalLink />}
          content={link}
        />
      </ModalContent>
      <ModalFooter className={styles.footer}>
        <Button
          className={styles.button}
          variant={ButtonType.SECONDARY}
          onClick={onClose}
        >
          {messages.goBack}
        </Button>
        <Button className={styles.button} onClick={handleOpen}>
          {messages.visitSite}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
