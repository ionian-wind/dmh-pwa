import { Dialog } from 'quasar';
import UnsavedChangesDialog from './UnsavedChangesDialog.vue';

export type UnsavedChangesChoice = 'save' | 'discard' | 'cancel';

/**
 * Ask what to do with unsaved edits before leaving the current page.
 *
 * Unlike the yes/no confirmation helper this exposes three explicit actions so
 * the user can save, discard, or cancel the navigation.
 */
export function confirmUnsavedChanges(
  message?: string,
): Promise<UnsavedChangesChoice> {
  return new Promise((resolve) => {
    Dialog.create({
      component: UnsavedChangesDialog,
      componentProps: { message },
      persistent: true,
    })
      .onOk((choice?: UnsavedChangesChoice) => resolve(choice ?? 'save'))
      .onCancel(() => resolve('cancel'));
  });
}
