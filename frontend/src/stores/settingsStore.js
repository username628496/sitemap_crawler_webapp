import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useSettingsStore = create(
  persist(
    (set) => ({
      sinbyteApiKey: '',
      setSinbyteApiKey: (key) => set({ sinbyteApiKey: key }),
    }),
    {
      name: 'crawler-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)