import type {
  ParsedElement,
  ParsedRelationship,
  SpecificationInfo,
  SyncReport,
} from "../types.js";

export interface ResolveResult {
  validElements: ParsedElement[];
  validRelationships: ParsedRelationship[];
  undeclaredKinds: SyncReport["issues"]["undeclaredKinds"];
  danglingTargets: SyncReport["issues"]["danglingTargets"];
}

export function resolveModel(
  elements: ParsedElement[],
  relationships: ParsedRelationship[],
  spec: SpecificationInfo,
  declaredIds: string[],
): ResolveResult {
  const undeclaredKinds: SyncReport["issues"]["undeclaredKinds"] = [];
  const danglingTargets: SyncReport["issues"]["danglingTargets"] = [];

  const validElements: ParsedElement[] = [];
  for (const el of elements) {
    if (spec.elementKinds.has(el.kind)) {
      validElements.push(el);
    } else {
      undeclaredKinds.push({
        id: el.id,
        kind: el.kind,
        sourceFile: el.sourceFile,
        sourceLine: el.sourceLine,
        context: "element",
      });
    }
  }
  const validElementIds = new Set(validElements.map((e) => e.id));
  const validTargetIds = new Set([...declaredIds, ...validElementIds]);

  const validRelationships: ParsedRelationship[] = [];
  for (const rel of relationships) {
    if (!validElementIds.has(rel.source)) {
      // Source element had an undeclared kind; already flagged above.
      continue;
    }
    if (rel.kind && !spec.relationshipKinds.has(rel.kind)) {
      undeclaredKinds.push({
        id: `${rel.source}->${rel.target}`,
        kind: rel.kind,
        sourceFile: rel.sourceFile,
        sourceLine: rel.sourceLine,
        context: "relationship",
      });
      continue;
    }
    if (!validTargetIds.has(rel.target)) {
      danglingTargets.push({
        source: rel.source,
        target: rel.target,
        label: rel.label,
        sourceFile: rel.sourceFile,
        sourceLine: rel.sourceLine,
      });
      continue;
    }
    validRelationships.push(rel);
  }

  return { validElements, validRelationships, undeclaredKinds, danglingTargets };
}
