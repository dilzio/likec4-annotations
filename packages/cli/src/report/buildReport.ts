import type { ParsedElement, ParsedRelationship, SyncReport } from "../types.js";
import type { ResolveResult } from "../model/resolve.js";
import type { PreviousElement, PreviousRelationship } from "../diff/previousGenerated.js";
import { relationshipKey } from "../diff/previousGenerated.js";
import type { ValidateResult } from "../validate/runLikeC4Validate.js";
import type { MalformedTag } from "../types.js";

export interface BuildReportInput {
  repoRoot: string;
  modelDir: string;
  filesScanned: number;
  filesWithAnnotations: number;
  resolved: ResolveResult;
  malformedTags: MalformedTag[];
  previousElements: PreviousElement[];
  previousRelationships: PreviousRelationship[];
  elementsFile: string;
  relationshipsFile: string;
  changed: boolean;
  validate: ValidateResult;
  manualDirConfirmed: boolean;
  viewsDirConfirmed: boolean;
  now: string;
}

export function buildReport(input: BuildReportInput): SyncReport {
  const { resolved } = input;

  const previousElementIds = new Set(input.previousElements.map((e) => e.id));
  const currentElementIds = new Set(resolved.validElements.map((e) => e.id));

  const newElements = resolved.validElements.filter((e) => !previousElementIds.has(e.id));
  const orphanedElements = input.previousElements.filter((e) => !currentElementIds.has(e.id));

  const previousRelKeys = new Set(input.previousRelationships.map(relationshipKey));
  const currentRelKeys = new Set(resolved.validRelationships.map(relationshipKey));

  const addedRelationships = resolved.validRelationships.filter(
    (r) => !previousRelKeys.has(relationshipKey(r)),
  );
  const removedRelationships = input.previousRelationships.filter(
    (r) => !currentRelKeys.has(relationshipKey(r)),
  );

  return {
    schemaVersion: 1,
    timestamp: input.now,
    repoRoot: input.repoRoot,
    modelDir: input.modelDir,
    scan: {
      filesScanned: input.filesScanned,
      filesWithAnnotations: input.filesWithAnnotations,
    },
    elements: {
      total: resolved.validElements.length,
      new: newElements.map((e) => ({
        id: e.id,
        kind: e.kind,
        sourceFile: e.sourceFile,
        sourceLine: e.sourceLine,
      })),
      orphaned: orphanedElements.map((e) => ({ id: e.id, kind: e.kind })),
    },
    relationships: {
      total: resolved.validRelationships.length,
      added: addedRelationships.map((r) => ({
        source: r.source,
        target: r.target,
        label: r.label,
        sourceFile: r.sourceFile,
        sourceLine: r.sourceLine,
      })),
      removed: removedRelationships.map((r) => ({
        source: r.source,
        target: r.target,
        label: r.label,
      })),
    },
    issues: {
      danglingTargets: resolved.danglingTargets,
      undeclaredKinds: resolved.undeclaredKinds,
      malformedTags: input.malformedTags,
    },
    write: {
      elementsFile: input.elementsFile,
      relationshipsFile: input.relationshipsFile,
      changed: input.changed,
    },
    validate: input.validate,
    untouched: {
      manualDirConfirmed: input.manualDirConfirmed,
      viewsDirConfirmed: input.viewsDirConfirmed,
    },
  };
}

export type { ParsedElement, ParsedRelationship };
