const config = {
    preset: 'ts-jest/presets/default-esm',
    collectCoverageFrom: ['src/*.ts', '!**/node_modules/**', '!**/tests/**'],
    moduleNameMapper: {
        'deepl-node(.*)': '<rootDir>/src$1',
        '^axios$': '<rootDir>/node_modules/axios/dist/node/axios.cjs',
    },
};
module.exports = config;
