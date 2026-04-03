import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      sinbyteApiKey: '',
      setSinbyteApiKey: (key) => set({ sinbyteApiKey: key }),
      onehpingApiKey: '',
      setOnehpingApiKey: (key) => set({ onehpingApiKey: key }),
    }),
    {
      name: 'crawler-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
