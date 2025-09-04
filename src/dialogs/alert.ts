import { Dialog } from 'quasar';

export interface AlertOptions {
  title?: string;
  okText?: string;
  color?: string;
  // Add more Quasar Dialog options as needed
}

export function alert(message: string, options: AlertOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    Dialog.create({
      message,
      title: options.title || 'Alert',
      ok: {
        label: options.okText || 'OK',
        color: options.color || 'primary',
      },
      ...options,
    }).onOk(() => resolve());
  });
} 