export const exposeConsole = async () => {
  const { Console } = await import('node:console');
  globalThis.console = new Console(process.stdout, process.stderr);
}

export const debug = (...args: any[]) => {
  // All debug output should go through this function
  // eslint-disable-next-line no-console
  console.log(...args);
}

export const debugWarn = (...args: any[]) => {
  // All warning output should go through this function
  // eslint-disable-next-line no-console
  console.warn(...args);
}

export const debugError = (...args: any[]) => {
  // All error output should go through this function
  // eslint-disable-next-line no-console
  console.error(...args);
} 
