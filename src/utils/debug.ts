export const exposeConsole = async () => {
  const { Console } = await import('node:console');
  globalThis.console = new Console(process.stdout, process.stderr);
};

// Debug output is only enabled in the development environment. Tests and
// production builds stay quiet so console noise never hides real failures.
export const debug = (...args: any[]) => {
  // All debug output should go through this function
  if (import.meta.env.MODE !== 'development') return;
  // eslint-disable-next-line no-console
  console.log(...args);
};

export const debugWarn = (...args: any[]) => {
  // All warning output should go through this function
  if (import.meta.env.MODE !== 'development') return;
  // eslint-disable-next-line no-console
  console.warn(...args);
};

export const debugError = (...args: any[]) => {
  // All error output should go through this function
  if (import.meta.env.MODE !== 'development') return;
  // eslint-disable-next-line no-console
  console.error(...args);
};
