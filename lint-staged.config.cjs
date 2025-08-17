module.exports = {
  '**/*.{ts,tsx}': [
    'eslint --max-warnings=0',
    'prettier --write',
    'tsc --noEmit -p tsconfig.base.json',
  ],
};
