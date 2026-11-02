import { Dialog, PromptInputType } from 'quasar';
import i18n from '@/i18n';

export interface PromptOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
  color?: string;
  inputType?: PromptInputType;
  modelValue?: string;
  // Add more Quasar Dialog options as needed
}

export function prompt(
  message: string,
  options: PromptOptions = {},
): Promise<string | null> {
  return new Promise((resolve) => {
    Dialog.create({
      message,
      title: options.title || i18n.global.t('common.prompt'),
      prompt: {
        model: options.modelValue || '',
        type: options.inputType || 'text',
      },
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
      .onOk((data: string) => resolve(data))
      .onCancel(() => resolve(null));
  });
}
