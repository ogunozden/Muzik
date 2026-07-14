import {afterEach, describe, expect, it} from "vitest";
import {getConfig} from "../ai-config.mjs";

const originalEnv = {
  GEMINI_GROUNDING_MAX_PROMPTS_PER_RUN: process.env.GEMINI_GROUNDING_MAX_PROMPTS_PER_RUN,
  GEMINI_GROUNDING_DAILY_SOFT_LIMIT: process.env.GEMINI_GROUNDING_DAILY_SOFT_LIMIT,
  GEMINI_GROUNDING_MIN_INTERVAL_MS: process.env.GEMINI_GROUNDING_MIN_INTERVAL_MS,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("AI config", () => {
  it("configures Gemini grounding with explicit local quota controls", () => {
    process.env.GEMINI_GROUNDING_MAX_PROMPTS_PER_RUN = "3";
    process.env.GEMINI_GROUNDING_DAILY_SOFT_LIMIT = "9";
    process.env.GEMINI_GROUNDING_MIN_INTERVAL_MS = "1500";

    const {config} = getConfig("gemini-grounded");

    expect(config.provider).toBe("gemini");
    expect(config.grounding).toBe(true);
    expect(config.maxPromptsPerRun).toBe(3);
    expect(config.dailySoftLimit).toBe(9);
    expect(config.minIntervalMs).toBe(1500);
    expect(config.usagePath).toBe("output/ai-usage/gemini-grounding-usage.json");
    expect(config.limitPolicy).toContain("capped");
    expect(config.freeTier).toBeUndefined();
  });

  it("does not mark non-grounded Gemini providers as unlimited free tier", () => {
    const {config} = getConfig("gemini-flash");

    expect(config.grounding).toBe(false);
    expect(config.limitPolicy).toContain("provider-managed");
    expect(config.freeTier).toBeUndefined();
  });
});
