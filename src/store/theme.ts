import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ThemeState {
  isDarkMode: boolean;
  showSenderSiret: boolean;
  showSenderTva: boolean;
  showClientSiret: boolean;
  showClientPhone: boolean;
  showSenderPhone: boolean;
  showTva: boolean;
  showSenderEmail: boolean;
  showClientEmail: boolean;
  showSenderName: boolean;
  showLogo: boolean;
  toggleDarkMode: () => void;
  toggleSenderSiret: () => void;
  toggleSenderTva: () => void;
  toggleClientSiret: () => void;
  toggleClientPhone: () => void;
  toggleSenderPhone: () => void;
  toggleTva: () => void;
  toggleSenderEmail: () => void;
  toggleClientEmail: () => void;
  toggleSenderName: () => void;
  toggleLogo: () => void;
}

const initialState = {
  isDarkMode: false,
  showSenderSiret: true, // Par défaut affiché
  showSenderTva: false, // Par défaut masqué
  showClientSiret: false, // Par défaut masqué
  showClientPhone: false, // Par défaut masqué
  showSenderPhone: false, // Par défaut masqué
  showTva: true,
  showSenderEmail: false, // Par défaut masqué
  showClientEmail: false, // Par défaut masqué
  showSenderName: true, // Par défaut affiché
  showLogo: true // Par défaut affiché
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...initialState,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      toggleSenderSiret: () => set((state) => ({ showSenderSiret: !state.showSenderSiret })),
      toggleSenderTva: () => set((state) => ({ showSenderTva: !state.showSenderTva })),
      toggleClientSiret: () => set((state) => ({ showClientSiret: !state.showClientSiret })),
      toggleClientPhone: () => set((state) => ({ showClientPhone: !state.showClientPhone })),
      toggleSenderPhone: () => set((state) => ({ showSenderPhone: !state.showSenderPhone })),
      toggleTva: () => set((state) => ({ showTva: !state.showTva })),
      toggleSenderEmail: () => set((state) => ({ showSenderEmail: !state.showSenderEmail })),
      toggleClientEmail: () => set((state) => ({ showClientEmail: !state.showClientEmail })),
      toggleSenderName: () => set((state) => ({ showSenderName: !state.showSenderName })),
      toggleLogo: () => set((state) => ({ showLogo: !state.showLogo }))
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch (error) {
          console.error('Storage error:', error);
          return {
            getItem: () => JSON.stringify(initialState),
            setItem: () => {},
            removeItem: () => {}
          };
        }
      })
    }
  )
);