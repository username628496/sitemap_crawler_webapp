import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      sinbyteApiKey: '',
      setSinbyteApiKey: (key) => set({ sinbyteApiKey: key }),
      onehpingApiKey: '',
      setOnehpingApiKey: (key) => set({ onehpingApiKey: key }),
      instantIndexerApiKey: '',
      setInstantIndexerApiKey: (key) => set({ instantIndexerApiKey: key }),
      linksIndexerApiKey: '',
      setLinksIndexerApiKey: (key) => set({ linksIndexerApiKey: key }),
      speedyIndexApiKey: '',
      setSpeedyIndexApiKey: (key) => set({ speedyIndexApiKey: key }),
    }),
    {
      name: 'crawler-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
