import base from '../../jest.config.base.js'

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  ...base,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.eslint.json'
      }
    ]
  },
  // Inject Jest globals for ESM
  injectGlobals: true
}
