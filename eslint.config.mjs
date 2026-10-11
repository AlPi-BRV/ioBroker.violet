// ioBroker ESLint configuration (flat config)
import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        ignores: ['www/**', 'admin/**', 'tools/**', 'docs/**', '.dev-server/**', '**/*.test.js', 'node_modules/**'],
    },
    {
        rules: {
            // JSDoc is optional in this adapter
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',
            'jsdoc/require-param-description': 'off',
            'jsdoc/require-returns-description': 'off',
            'jsdoc/require-returns-check': 'off',
        },
    },
];
