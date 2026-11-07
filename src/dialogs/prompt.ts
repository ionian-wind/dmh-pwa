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
    const {
      title,
      okText,
      cancelText,
      color,
      inputType,
      modelValue,
      ...dialogOptions
    } = options;

    Dialog.create({
      message,
      title: title || i18n.global.t('common.prompt'),
      prompt: {
        model: modelValue || '',
        type: inputType || 'text',
      },
      ok: {
        label: okText || i18n.global.t('common.ok'),
        color: color || 'primary',
      },
      cancel: {
        label: cancelText || i18n.global.t('common.cancel'),
        color: color || 'grey-7',
      },
      persistent: true,
      ...dialogOptions,
    })
      .onOk((data: string) => resolve(data))
      .onCancel(() => resolve(null));
  });
}
