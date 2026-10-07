import { readFileSync, existsSync } from "node:fs";
import type { SpecificationInfo } from "../types.js";
import { extractDeclaredIds } from "./manualIds.js";

export function readSpecification(specificationPath: string): {
  spec: SpecificationInfo;
  declaredIds: string[];
} {
  if (!existsSync(specificationPath)) {
    return { spec: { elementKinds: new Set(), relationshipKinds: new Set() }, declaredIds: [] };
  }
  const content = readFileSync(specificationPath, "utf8");

  const elementKinds = new Set<string>();
  for (const match of content.matchAll(/^\s*element\s+([A-Za-z][\w-]*)/gm)) {
    elementKinds.add(match[1]);
  }

  const relationshipKinds = new Set<string>();
  for (const match of content.matchAll(/^\s*relationship\s+([A-Za-z][\w-]*)/gm)) {
    relationshipKinds.add(match[1]);
  }

  return {
    spec: { elementKinds, relationshipKinds },
    declaredIds: extractDeclaredIds(content),
  };
}
