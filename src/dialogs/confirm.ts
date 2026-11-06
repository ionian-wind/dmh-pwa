import { Dialog } from 'quasar';
import i18n from '@/i18n';
import { useConfigStore } from '@/utils/configStore';

export interface ConfirmOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
  color?: string;
  okColor?: string;
  cancelColor?: string;
  /** Always ask, even when the global delete-confirmation setting is off. */
  force?: boolean;
  // Add more Quasar Dialog options as needed
}

export function confirm(
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  if (!options.force && !useConfigStore().confirmDelete) {
    return Promise.resolve(true);
  }

  const {
    okColor,
    cancelColor,
    force: _force,
    okText,
    cancelText,
    title,
    color,
    ...dialogOptions
  } = options;

  return new Promise((resolve) => {
    Dialog.create({
      message,
      title: title || i18n.global.t('common.confirm'),
      ok: {
        label: okText || i18n.global.t('common.ok'),
        color: okColor || color || 'primary',
      },
      cancel: {
        label: cancelText || i18n.global.t('common.cancel'),
        color: cancelColor || color || 'secondary',
        textColor: 'dark',
      },
      persistent: true,
      ...dialogOptions,
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });
}
