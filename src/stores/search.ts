import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SearchStore {
  query: string
  recentSearches: string[]
  isOpen: boolean
  setQuery: (query: string) => void
  addRecentSearch: (query: string) => void
  clearRecentSearches: () => void
  toggleSearch: () => void
}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      query: '',
      recentSearches: [],
      isOpen: false,

      setQuery: (query) => set({ query }),

      addRecentSearch: (query) => {
        const trimmed = query.trim()
        if (!trimmed) return
        set((state) => {
          const filtered = state.recentSearches.filter(
            (s) => s.toLowerCase() !== trimmed.toLowerCase()
          )
          return {
            recentSearches: [trimmed, ...filtered].slice(0, 10),
          }
        })
      },

      clearRecentSearches: () => set({ recentSearches: [] }),

      toggleSearch: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'omcellular-search',
      partialize: (state) => ({
        recentSearches: state.recentSearches,
      }),
    }
  )
)
