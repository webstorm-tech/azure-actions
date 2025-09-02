import base from "../../jest.config.base.js";

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  ...base,
  globals: {
    "ts-jest": {
      useESM: true,
    },
  },
  // Inject Jest globals for ESM
  injectGlobals: true,
};
