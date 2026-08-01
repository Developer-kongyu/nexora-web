import { useContext } from 'react';
import { fallbackToastContext, ToastContext } from './ToastContext';

export function useToast() {
  return useContext(ToastContext) ?? fallbackToastContext;
}
