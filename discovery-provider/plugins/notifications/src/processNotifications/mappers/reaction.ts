import { Knex } from 'knex'
import { NotificationRow, UserRow } from '../../types/dn'
import { ReactionNotification } from '../../types/notifications'
import { BaseNotification } from './base'
import { sendPushNotification } from '../../sns'
import { ResourceIds, Resources } from '../../email/notifications/renderEmail'
import { capitalize } from '../../email/notifications/components/utils'
import { formatWei } from '../../utils/format'
import {
  buildUserNotificationSettings,
  Device
} from './userNotificationSettings'

type ReactionNotificationRow = Omit<NotificationRow, 'data'> & {
  data: ReactionNotification
}
export class Reaction extends BaseNotification<ReactionNotificationRow> {
  reactedTo: string
  reactionType: string
  reactionValue: number
  senderWallet: string
  receiverUserId: number
  senderUserId: number
  tipAmount: string

  constructor(
    dnDB: Knex,
    identityDB: Knex,
    notification: ReactionNotificationRow
  ) {
    super(dnDB, identityDB, notification)
    const userIds: number[] = this.notification.user_ids!
    this.reactedTo = this.notification.data.reacted_to
    this.reactionType = this.notification.data.reaction_type
    this.reactionValue = this.notification.data.reaction_value
    this.senderWallet = this.notification.data.sender_wallet
    this.receiverUserId = this.notification.data.receiver_user_id
    this.senderUserId = this.notification.data.sender_user_id
    this.tipAmount = this.notification.data.tip_amount
  }

  async pushNotification() {
    const res: Array<{
      user_id: number
      name: string
      is_deactivated: boolean
    }> = await this.dnDB
      .select('user_id', 'name', 'is_deactivated')
      .from<UserRow>('users')
      .where('is_current', true)
      .whereIn('user_id', [this.receiverUserId, this.senderUserId])
    const users = res.reduce((acc, user) => {
      acc[user.user_id] = {
        name: user.name,
        isDeactivated: user.is_deactivated
      }
      return acc
    }, {} as Record<number, { name: string; isDeactivated: boolean }>)

    if (users?.[this.senderUserId]?.isDeactivated) {
      return
    }

    // Get the user's notification setting from identity service
    const userNotificationSettings = await buildUserNotificationSettings(
      this.identityDB,
      [this.receiverUserId, this.senderUserId]
    )

    const reactingUserName = users[this.receiverUserId]?.name
    const tipAmount = formatWei(this.tipAmount, 'sol')

    // If the user has devices to the notification to, proceed
    if (
      userNotificationSettings.shouldSendPushNotification({
        // in this case, the person who sent the tip is receiving
        // a notif of the tip recipient's reaction
        receiverUserId: this.senderUserId,
        initiatorUserId: this.receiverUserId
      })
    ) {
      const devices: Device[] = userNotificationSettings.getDevices(
        this.senderUserId
      )
      await Promise.all(
        devices.map((device) => {
          return sendPushNotification(
            {
              type: device.type,
              badgeCount:
                userNotificationSettings.getBadgeCount(this.senderUserId) + 1,
              targetARN: device.awsARN
            },
            {
              title: `${capitalize(reactingUserName)} reacted`,
              body: `${capitalize(
                reactingUserName
              )} reacted to your tip of ${tipAmount} $AUDIO`,
              data: {
                entityId: this.receiverUserId,
                type: 'Reaction',
                id: `timestamp:${this.getNotificationTimestamp()}:group_id:${
                  this.notification.group_id
                }`
              }
            }
          )
        })
      )
      await this.incrementBadgeCount(this.senderUserId)
    }
    if (
      userNotificationSettings.shouldSendEmail({
        initiatorUserId: this.receiverUserId,
        receiverUserId: this.senderUserId
      })
    ) {
      // TODO: Send out email
    }
  }

  getResourcesForEmail(): ResourceIds {
    return {
      users: new Set([this.senderUserId, this.receiverUserId])
    }
  }

  formatEmailProps(resources: Resources) {
    const receiverUser = resources.users[this.receiverUserId]
    const amount = formatWei(this.tipAmount, 'sol')
    return {
      type: this.notification.type,
      reactingUser: { name: receiverUser.name },
      amount
    }
  }
}
