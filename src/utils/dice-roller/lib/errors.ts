// Shared error and warning classes for dice parser

export class DiceSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiceSyntaxError';
  }
}

export class DiceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiceValidationError';
  }
}

export class DiceMissingDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiceMissingDataError';
  }
}

export class DiceWarning {
  message: string;
  constructor(message: string) {
    this.message = message;
  }
}
