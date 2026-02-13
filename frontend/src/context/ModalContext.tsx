import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types for different modals
interface BarcodeScannerModalState {
  visible: boolean;
  onScan?: (barcode: string) => void;
}

interface TrialModalState {
  visible: boolean;
  app?: {
    id: string;
    name: string;
    tagline: string;
    description: string;
    icon: string;
    color: string;
    bgColor: string;
    gradientColors: [string, string];
    features: string[];
    route: string;
  };
  onStartTrial?: () => void;
}

interface ConfirmModalState {
  visible: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

interface ModalContextType {
  // Barcode Scanner
  barcodeScannerModal: BarcodeScannerModalState;
  openBarcodeScanner: (onScan: (barcode: string) => void) => void;
  closeBarcodeScanner: () => void;
  
  // Trial Modal
  trialModal: TrialModalState;
  openTrialModal: (app: TrialModalState['app'], onStartTrial?: () => void) => void;
  closeTrialModal: () => void;
  
  // Generic Confirm Modal
  confirmModal: ConfirmModalState;
  openConfirmModal: (options: Omit<ConfirmModalState, 'visible'>) => void;
  closeConfirmModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  // Barcode Scanner State
  const [barcodeScannerModal, setBarcodeScannerModal] = useState<BarcodeScannerModalState>({
    visible: false,
  });
  
  // Trial Modal State
  const [trialModal, setTrialModal] = useState<TrialModalState>({
    visible: false,
  });
  
  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    visible: false,
  });

  // Barcode Scanner Methods
  const openBarcodeScanner = useCallback((onScan: (barcode: string) => void) => {
    console.log('ModalContext: Opening barcode scanner');
    setBarcodeScannerModal({ visible: true, onScan });
  }, []);
  
  const closeBarcodeScanner = useCallback(() => {
    console.log('ModalContext: Closing barcode scanner');
    setBarcodeScannerModal({ visible: false });
  }, []);

  // Trial Modal Methods
  const openTrialModal = useCallback((app: TrialModalState['app'], onStartTrial?: () => void) => {
    console.log('ModalContext: Opening trial modal for', app?.name);
    setTrialModal({ visible: true, app, onStartTrial });
  }, []);
  
  const closeTrialModal = useCallback(() => {
    console.log('ModalContext: Closing trial modal');
    setTrialModal({ visible: false });
  }, []);

  // Confirm Modal Methods
  const openConfirmModal = useCallback((options: Omit<ConfirmModalState, 'visible'>) => {
    console.log('ModalContext: Opening confirm modal');
    setConfirmModal({ ...options, visible: true });
  }, []);
  
  const closeConfirmModal = useCallback(() => {
    console.log('ModalContext: Closing confirm modal');
    setConfirmModal({ visible: false });
  }, []);

  return (
    <ModalContext.Provider
      value={{
        barcodeScannerModal,
        openBarcodeScanner,
        closeBarcodeScanner,
        trialModal,
        openTrialModal,
        closeTrialModal,
        confirmModal,
        openConfirmModal,
        closeConfirmModal,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

export default ModalContext;
