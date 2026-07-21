import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SelectedItem {
  id: string;
  name: string;
  optionName?: string;
  quantity: number;
}

interface AppState {
  step: number;
  setStep: (step: number) => void;
  
  customerName: string;
  setCustomerName: (val: string) => void;
  
  studentId: string;
  setStudentId: (val: string) => void;
  
  paymentMethod: string;
  setPaymentMethod: (val: string) => void;
  
  hasBackorder: 'yes' | 'no' | 'unknown' | null;
  setHasBackorder: (val: 'yes' | 'no' | 'unknown') => void;
  
  receivedItems: SelectedItem[];
  setReceivedItems: (items: SelectedItem[]) => void;
  
  backorderItems: SelectedItem[];
  setBackorderItems: (items: SelectedItem[]) => void;
  
  totalAmount: string;
  setTotalAmount: (val: string) => void;
  
  hasDiscount: 'yes' | 'no' | 'unknown' | null;
  setHasDiscount: (val: 'yes' | 'no' | 'unknown') => void;
  
  purchaseTime: string; 
  setPurchaseTime: (val: string) => void;
  
  matchedOrder: any | null;
  setMatchedOrder: (order: any) => void;
  
  reset: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      step: 0,
      setStep: (step) => set({ step }),
      customerName: '',
      setCustomerName: (val) => set({ customerName: val }),
      studentId: '',
      setStudentId: (val) => set({ studentId: val }),
      paymentMethod: '',
      setPaymentMethod: (val) => set({ paymentMethod: val }),
      hasBackorder: null,
      setHasBackorder: (val) => set({ hasBackorder: val }),
      receivedItems: [],
      setReceivedItems: (items) => set({ receivedItems: items }),
      backorderItems: [],
      setBackorderItems: (items) => set({ backorderItems: items }),
      totalAmount: '',
      setTotalAmount: (val) => set({ totalAmount: val }),
      hasDiscount: null,
      setHasDiscount: (val) => set({ hasDiscount: val }),
      purchaseTime: '',
      setPurchaseTime: (val) => set({ purchaseTime: val }),
      matchedOrder: null,
      setMatchedOrder: (order) => set({ matchedOrder: order }),
      reset: () => set({
        step: 0,
        customerName: '',
        studentId: '',
        paymentMethod: '',
        hasBackorder: null,
        receivedItems: [],
        backorderItems: [],
        totalAmount: '',
        hasDiscount: null,
        purchaseTime: '',
        matchedOrder: null
      })
    }),
    {
      name: 'kiosk-storage',
      partialize: (state) => {
        if (state.step >= 10) {
          // If we reach receipt or after, don't persist it. So it resets on refresh.
          return {
            step: 0,
            customerName: '',
            studentId: '',
            paymentMethod: '',
            hasBackorder: null,
            receivedItems: [],
            backorderItems: [],
            totalAmount: '',
            hasDiscount: null,
            purchaseTime: '',
            matchedOrder: null
          };
        }
        return state;
      }
    }
  )
);
