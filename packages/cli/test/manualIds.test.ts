import { describe, expect, it } from "vitest";
import { extractDeclaredIds, extractDeclaredIdsWithPaths } from "../src/model/manualIds.js";

const FLAT_MANUAL = `model {
  stripe-api = softwareSystem 'Stripe API' {
    #external
    description 'Third-party payment processor.'
  }

  fulfillment-queue = softwareSystem 'Fulfillment Queue' {
    #external
  }
}
`;

const NESTED_MANUAL = `model {
  cloud = softwareSystem 'Cloud' {
    backend = container 'Backend' {
      api = component 'API' {
        description 'Handles inbound requests.'
      }
    }
    frontend = container 'Frontend' {}
  }
}
`;

describe("extractDeclaredIds (bare ids, unchanged shape)", () => {
  it("extracts bare ids from a flat manual file", () => {
    expect(extractDeclaredIds(FLAT_MANUAL)).toEqual(["stripe-api", "fulfillment-queue"]);
  });
});

describe("extractDeclaredIdsWithPaths", () => {
  it("resolves a flat manual file's paths identically to its bare ids (unchanged result)", () => {
    const result = extractDeclaredIdsWithPaths(FLAT_MANUAL);
    expect(result).toEqual([
      { id: "stripe-api", path: "stripe-api" },
      { id: "fulfillment-queue", path: "fulfillment-queue" },
    ]);
  });

  it("computes dotted paths for a nested manual file", () => {
    const result = extractDeclaredIdsWithPaths(NESTED_MANUAL);
    expect(result).toEqual([
      { id: "cloud", path: "cloud" },
      { id: "backend", path: "cloud.backend" },
      { id: "api", path: "cloud.backend.api" },
      { id: "frontend", path: "cloud.frontend" },
    ]);
  });

  it("ignores braces inside quoted string literals when tracking depth", () => {
    const content = `model {
  weird = softwareSystem 'Looks like a { block } but is just a title' {
    description 'has a } too'
  }
}
`;
    const result = extractDeclaredIdsWithPaths(content);
    expect(result).toEqual([{ id: "weird", path: "weird" }]);
  });
});
