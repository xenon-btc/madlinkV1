import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface InvoiceData {
  sender: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    siret: string;
    tva: string;
  };
  client: {
    name: string;
    address: string;
    city: string;
    phone: string;
    email: string;
    siret: string;
  };
  logo: string;
}

interface InvoiceState extends InvoiceData {
  updateSender: (sender: Partial<InvoiceData['sender']>) => void;
  updateClient: (client: Partial<InvoiceData['client']>) => void;
  setLogo: (logo: string) => void;
  clearClient: () => void;
  clearSender: () => void;
  clearLogo: () => void;
  resetClientForNewInvoice: () => void;
}

const initialState: InvoiceData = {
  sender: {
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    siret: '',
    tva: ''
  },
  client: {
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    siret: ''
  },
  logo: ''
};

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set) => ({
      ...initialState,
      updateSender: (senderData) =>
        set((state) => ({
          sender: { ...state.sender, ...senderData }
        })),
      updateClient: (clientData) =>
        set((state) => ({
          client: { ...state.client, ...clientData }
        })),
      setLogo: (logo) => set({ logo }),
      clearClient: () =>
        set({
          client: {
            name: '',
            address: '',
            city: '',
            phone: '',
            email: '',
            siret: ''
          }
        }),
      clearSender: () =>
        set({
          sender: {
            name: '',
            address: '',
            city: '',
            phone: '',
            email: '',
            siret: '',
            tva: ''
          }
        }),
      clearLogo: () => set({ logo: '' }),
      resetClientForNewInvoice: () =>
        set({
          client: {
            name: '',
            address: '',
            city: '',
            phone: '',
            email: '',
            siret: ''
          }
        })
    }),
    {
      name: 'invoice-storage',
      storage: localStorage,
      partialize: (state) => ({
        sender: state.sender,
        logo: state.logo
        // Les données client ne sont pas sauvegardées pour permettre de changer de client à chaque facture
      })
    }
  )
);