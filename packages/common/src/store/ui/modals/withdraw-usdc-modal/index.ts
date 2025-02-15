import { createModal } from '../createModal'

export enum WithdrawUSDCModalPages {
  ENTER_TRANSFER_DETAILS = 'enter_transfer_details',
  CONFIRM_TRANSFER_DETAILS = 'confirm_transfer_details',
  TRANSFER_IN_PROGRESS = 'transfer_in_progress',
  TRANSFER_SUCCESSFUL = 'transfer_successful',
  ERROR = 'error'
}

export type WithdrawUSDCModalState = {
  page: WithdrawUSDCModalPages
}

const withdrawUSDCModal = createModal<WithdrawUSDCModalState>({
  reducerPath: 'WithdrawUSDCModal',
  initialState: {
    isOpen: false,
    page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS
  },
  sliceSelector: (state) => state.ui.modals
})

export const {
  hook: useWithdrawUSDCModal,
  reducer: withdrawUSDCModalReducer,
  actions: withdrawUSDCModalActions
} = withdrawUSDCModal
