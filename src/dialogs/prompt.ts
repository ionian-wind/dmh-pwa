import { Dialog, PromptInputType } from 'quasar';

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
      title: options.title || 'Prompt',
      prompt: {
        model: options.modelValue || '',
        type: options.inputType || 'text',
      },
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
    })
      .onOk((data: string) => resolve(data))
      .onCancel(() => resolve(null));
  });
}
