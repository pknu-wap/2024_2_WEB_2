import { isDevLoginEnabled } from "./devLogin";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

test.each([
  ["development", true],
  ["production", false],
  ["test", false],
])("NODE_ENV=%s enables login: %s", (nodeEnv, expected) => {
  process.env.NODE_ENV = nodeEnv;
  expect(isDevLoginEnabled()).toBe(expected);
});
