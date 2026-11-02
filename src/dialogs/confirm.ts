import { Dialog } from 'quasar';
import i18n from '@/i18n';

export interface ConfirmOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
  color?: string;
  // Add more Quasar Dialog options as needed
}

export function confirm(
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    Dialog.create({
      message,
      title: options.title || i18n.global.t('common.confirm'),
      ok: {
        label: options.okText || i18n.global.t('common.ok'),
        color: options.color || 'primary',
      },
      cancel: {
        label: options.cancelText || i18n.global.t('common.cancel'),
        color: options.color || 'secondary',
        textColor: 'dark',
      },
      persistent: true,
      ...options,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });
}
