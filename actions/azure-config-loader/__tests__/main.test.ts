import { jest, describe, test, beforeEach, expect } from "@jest/globals";
import * as core from '../__fixtures__/core.js'

jest.unstable_mockModule('@actions/core', () => core)

describe("Azure Config Loader Action", () => {
  describe("getInput", () => {
    beforeEach(() => {
      core.getInput.mockImplementation((name) => {
        switch (name) {
          case "config-file":
            return "";
          case "environment":
            return "production"
          default:
            return "";
        }
      })
    })
  });
});