import { createContext, useContext, useCallback } from 'react';
import { toast, Toaster } from 'react-hot-toast';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const showToast = useCallback((message, type = 'success') => {
    switch (type) {
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast(message);
        break;
      default:
        toast.success(message);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster position="top-right" />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
