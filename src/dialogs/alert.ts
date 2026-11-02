import { Dialog } from 'quasar';
import i18n from '@/i18n';

export interface AlertOptions {
  title?: string;
  okText?: string;
  color?: string;
  // Add more Quasar Dialog options as needed
}

export function alert(
  message: string,
  options: AlertOptions = {},
): Promise<void> {
  return new Promise((resolve) => {
    Dialog.create({
      message,
      title: options.title || i18n.global.t('common.alert'),
      ok: {
        label: options.okText || i18n.global.t('common.ok'),
        color: options.color || 'primary',
      },
      ...options,
    }).onOk(() => resolve());
  });
}
