import { create } from 'zustand';

// First real slice pulled out of the monolithic SaaSContext: the VoIP dialer
// modal is used by exactly two components (SaaSLayout, LeadsTab) and has no
// dependency on tenant/lead state, so it's a safe, self-contained extraction.
interface DialerStore {
  isDialerModalOpen: boolean;
  setIsDialerModalOpen: (val: boolean) => void;
  dialerCustomerNumber: string;
  setDialerCustomerNumber: (val: string) => void;
  dialerCustomerName: string;
  setDialerCustomerName: (val: string) => void;
  dialerState: 'dialing' | 'connected' | 'ended';
  setDialerState: (val: 'dialing' | 'connected' | 'ended') => void;
  dialerTimer: number;
  setDialerTimer: (val: number | ((prev: number) => number)) => void;
}

export const useDialerStore = create<DialerStore>((set) => ({
  isDialerModalOpen: false,
  setIsDialerModalOpen: (val) => set({ isDialerModalOpen: val }),
  dialerCustomerNumber: '',
  setDialerCustomerNumber: (val) => set({ dialerCustomerNumber: val }),
  dialerCustomerName: '',
  setDialerCustomerName: (val) => set({ dialerCustomerName: val }),
  dialerState: 'dialing',
  setDialerState: (val) => set({ dialerState: val }),
  dialerTimer: 0,
  setDialerTimer: (val) =>
    set((s) => ({ dialerTimer: typeof val === 'function' ? val(s.dialerTimer) : val })),
}));
