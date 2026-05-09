import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { base, browser } from '../../eslint.config.js';

export default [
  ...base,
  ...browser,
  reactHooks.configs.flat.recommended,
  reactRefresh.configs.vite,
];
