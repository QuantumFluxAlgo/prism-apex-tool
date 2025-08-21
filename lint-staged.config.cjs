export default {
  '**/*.{ts,tsx,js,jsx}': ['prettier --write', 'eslint --max-warnings=0 --fix'],
  '**/*.{md,json,yml,yaml,css,scss}': ['prettier --write'],
};
