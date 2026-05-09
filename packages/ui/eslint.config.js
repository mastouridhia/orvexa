import reactHooks from 'eslint-plugin-react-hooks';
import { base, browser } from '../../eslint.config.js';

export default [...base, ...browser, reactHooks.configs.flat.recommended];
