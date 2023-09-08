import { FavoritesScreen } from 'app/screens/favorites-screen'

import type { AppTabScreenParamList } from './AppTabScreen'
import { createAppTabScreenStack } from './createAppTabScreenStack'

export type FavoritesTabScreenParamList = AppTabScreenParamList & {
  Favorites: undefined
  CreatePlaylist: undefined
}

export const FavoritesTabScreen =
  createAppTabScreenStack<FavoritesTabScreenParamList>((Stack) => (
    <>
      <Stack.Screen name='Favorites' component={FavoritesScreen} />
    </>
  ))
