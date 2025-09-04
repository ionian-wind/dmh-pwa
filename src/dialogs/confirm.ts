import { Dialog } from 'quasar';

export interface ConfirmOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
  color?: string;
  // Add more Quasar Dialog options as needed
}

export function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    Dialog.create({
      message,
      title: options.title || 'Confirm',
      ok: {
        label: options.okText || 'OK',
        color: options.color || 'primary',
      },
      cancel: {
        label: options.cancelText || 'Cancel',
        color: options.color || 'secondary',
      },
      persistent: true,
      ...options,
    }).onOk(() => resolve(true)).onCancel(() => resolve(false));
  });
} 