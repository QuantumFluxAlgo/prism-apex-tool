export default {
  '**/*.{ts,js,json,md,yml,yaml}': ['prettier -w'],
  '**/*.ts': ['eslint --fix']
};
