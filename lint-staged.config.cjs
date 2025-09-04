module.exports = {
  // Type check TypeScript files
  '(src)/**/*.(ts|tsx)': () => 'npm run types-check',

  // Lint then format TypeScript and JavaScript files
  '(src)/**/*.(ts|tsx|js|cjs|mjs)': (filenames) => [
    `npm run hook:format -- ${filenames.join(' ')}`,
    // `npm run hook:lint -- ${filenames.join(' ')}`, // FIXME: uncomment after eslint styles fixing
  ]
};
