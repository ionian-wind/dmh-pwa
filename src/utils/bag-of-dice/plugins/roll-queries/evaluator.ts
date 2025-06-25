export function evaluateRollQuery(node: any, userInput?: string): string {
  if (!node || node.type !== 'RollQuery') {
    throw new Error('Invalid node: not a RollQuery');
  }
  // Multiple options: only allow id-based selection
  if (node.options && node.options.length > 1) {
    if (!userInput) {
      throw new Error('No user input provided for roll query with multiple options');
    }
    // Only allow id-based selection
    const found = node.options.find((opt: any) => opt.id === userInput);
    if (!found) {
      throw new Error('Invalid user input for roll query with multiple options: must provide option id');
    }
    return found.value;
  }
  // Single option: treat as default value, ignore userInput
  if (node.options && node.options.length === 1) {
    return node.options[0].value;
  }
  // No options: require non-empty userInput
  if (userInput && userInput !== '') {
    return userInput;
  }
  throw new Error('No user input provided for open-ended roll query');
} 