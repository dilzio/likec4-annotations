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
  unresolvedParents: SyncReport["issues"]["unresolvedParents"];
  parentCycles: SyncReport["issues"]["parentCycles"];
}

export function resolveModel(
  elements: ParsedElement[],
  relationships: ParsedRelationship[],
  spec: SpecificationInfo,
  declaredIds: string[],
  manualIdPaths: Map<string, string> = new Map(),
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

  const { unresolvedParents, parentCycles, elementPaths } = resolveParents(
    validElements,
    validElementIds,
    declaredIds,
    manualIdPaths,
  );

  for (const rel of validRelationships) {
    rel.source = elementPaths.get(rel.source) ?? manualIdPaths.get(rel.source) ?? rel.source;
    rel.target = elementPaths.get(rel.target) ?? manualIdPaths.get(rel.target) ?? rel.target;
  }

  return {
    validElements,
    validRelationships,
    undeclaredKinds,
    danglingTargets,
    unresolvedParents,
    parentCycles,
  };
}

function resolveParents(
  validElements: ParsedElement[],
  validElementIds: Set<string>,
  declaredIds: string[],
  manualIdPaths: Map<string, string>,
): {
  unresolvedParents: SyncReport["issues"]["unresolvedParents"];
  parentCycles: SyncReport["issues"]["parentCycles"];
  elementPaths: Map<string, string>;
} {
  const byId = new Map(validElements.map((e) => [e.id, e]));
  const knownParentTargets = new Set([...declaredIds, ...validElementIds]);

  const unresolvedParents: SyncReport["issues"]["unresolvedParents"] = [];
  for (const el of validElements) {
    if (el.parent !== undefined && !knownParentTargets.has(el.parent)) {
      unresolvedParents.push({
        id: el.id,
        parent: el.parent,
        sourceFile: el.sourceFile,
        sourceLine: el.sourceLine,
      });
    }
  }

  // Cycle detection over the element-to-element parent graph (out-degree <= 1 per
  // node, since each element has at most one `parent`). Chains that terminate at a
  // manual/declared id, or at an already-resolved node, are acyclic; a chain that
  // revisits a node still on its own walk is a genuine cycle.
  const status = new Map<string, "resolved" | "cycle">();
  const parentCycles: SyncReport["issues"]["parentCycles"] = [];

  for (const startId of validElementIds) {
    if (status.has(startId)) continue;
    const stack: string[] = [];
    const stackSet = new Set<string>();
    let current: string | undefined = startId;

    while (
      current !== undefined &&
      validElementIds.has(current) &&
      !status.has(current) &&
      !stackSet.has(current)
    ) {
      stack.push(current);
      stackSet.add(current);
      current = byId.get(current)?.parent;
    }

    if (current !== undefined && stackSet.has(current)) {
      const idx = stack.indexOf(current);
      const cycleIds = stack.slice(idx);
      const before = stack.slice(0, idx);
      for (const id of cycleIds) status.set(id, "cycle");
      for (const id of before) status.set(id, "resolved");

      const sortedIds = [...cycleIds].sort();
      const first = byId.get(sortedIds[0]);
      parentCycles.push({
        ids: sortedIds,
        sourceFile: first?.sourceFile ?? "",
        sourceLine: first?.sourceLine ?? 0,
      });
    } else {
      for (const id of stack) status.set(id, "resolved");
    }
  }

  const unresolvedParentIds = new Set(unresolvedParents.map((u) => u.id));

  function isNested(id: string): boolean {
    const el = byId.get(id);
    return el?.parent !== undefined && status.get(id) !== "cycle" && !unresolvedParentIds.has(id);
  }

  // Pass 1: compute every valid element's fully-qualified path, reading each
  // element's *original* `parent` id (string). Memoized so each id's path is
  // computed once regardless of how many descendants reference it.
  const elementPaths = new Map<string, string>();
  function resolveElementPath(id: string): string {
    const cached = elementPaths.get(id);
    if (cached !== undefined) return cached;
    const el = byId.get(id);
    let path: string;
    if (!el || !isNested(id) || el.parent === undefined) {
      path = id;
    } else if (validElementIds.has(el.parent)) {
      path = `${resolveElementPath(el.parent)}.${id}`;
    } else {
      const manualPath = manualIdPaths.get(el.parent) ?? el.parent;
      path = `${manualPath}.${id}`;
    }
    elementPaths.set(id, path);
    return path;
  }
  for (const el of validElements) resolveElementPath(el.id);

  // Pass 2: now that every path is cached, rewrite each element's `parent`
  // field in place to its immediate parent's resolved path (or clear it for a
  // top-level/cyclic/unresolved element), mirroring how relationship
  // endpoints are rewritten below.
  for (const el of validElements) {
    if (isNested(el.id) && el.parent !== undefined) {
      el.parent = validElementIds.has(el.parent)
        ? resolveElementPath(el.parent)
        : (manualIdPaths.get(el.parent) ?? el.parent);
    } else {
      el.parent = undefined;
    }
  }

  return { unresolvedParents, parentCycles, elementPaths };
}
