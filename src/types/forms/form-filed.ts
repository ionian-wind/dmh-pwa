import type { UUID } from '@types';

export enum FormFieldType {
  checkbox = 'checkbox',
  radio = 'radio',
  select = 'select',
  inputNumber = 'number',
  inputString = 'string',
  inputStringPattern = 'pattern',
  inputText = 'text',
  file = 'file',
}

export type FormFieldSimple = {
  label: string;
  description?: string;
  name?: UUID;
};

export type FormFieldBase = FormFieldSimple & {
  disabled?: boolean;
  required?: boolean;
  readonly?: boolean;
};

export type FormFieldInput = FormFieldBase & {
  placeholder?: string;
};

export type FormFieldCheckbox = FormFieldBase & {
  type: FormFieldType.checkbox;
  style?: 'toggle';
  selected?: boolean;
};

export interface FormFieldRadio extends FormFieldBase {
  type: FormFieldType.radio;
  value: string;
  selected?: boolean;
}

export type FormFieldOption = {
  label: string;
  value?: string;
  selected?: boolean;
  disabled?: boolean;
};

export type FormFieldSelect = FormFieldBase & {
  type: FormFieldType.select;
  multiple?: boolean;
  options: FormFieldOption[];
};

export type FormFieldInputText = FormFieldInput & {
  value?: string;
  minLength?: number;
  maxLength?: number;
};

export type FormFieldNumber = FormFieldInput & {
  type: FormFieldType.inputNumber;
  style?: 'range';
  dataType: 'integer' | 'decimal';
  counter?: boolean;
  value?: number;
  step?: number;
  minValue?: number;
  maxValue?: number;
  hidden?: boolean;
};

export type FormFieldStringPattern = FormFieldInputText & {
  type: FormFieldType.inputStringPattern;
  pattern?: string;
};

export type FormFieldString = FormFieldInputText & {
  type: FormFieldType.inputString;
  style?: 'email' | 'phone' | 'date' | 'datetime' | 'url';
  hidden?: boolean;
};

export type FormFieldText = FormFieldInputText & {
  type: FormFieldType.inputText;
};

export type FormFieldFile = FormFieldBase & {
  type: FormFieldType.file;
  accept?: string;
};

export type FormField =
  | FormFieldCheckbox
  | FormFieldRadio
  | FormFieldSelect
  | FormFieldNumber
  | FormFieldStringPattern
  | FormFieldString
  | FormFieldText
  | FormFieldFile;
