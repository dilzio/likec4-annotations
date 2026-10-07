import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import type { SyncOptions, SyncReport, ParsedElement, ParsedRelationship, MalformedTag } from "../types.js";
import { findAnnotatedFiles } from "../discovery/findAnnotatedFiles.js";
import { extractCommentBlocks } from "../parser/commentBlocks.js";
import { parseCommentBlock } from "../parser/parseAnnotations.js";
import { readSpecification } from "../model/specification.js";
import { readManualIds } from "../model/manualIds.js";
import { resolveModel } from "../model/resolve.js";
import { emitElements } from "../emit/elements.js";
import { emitRelationships } from "../emit/relationships.js";
import { readPreviousElements, readPreviousRelationships } from "../diff/previousGenerated.js";
import { runLikeC4Validate } from "../validate/runLikeC4Validate.js";
import { buildReport } from "../report/buildReport.js";

export async function runSync(
  opts: SyncOptions,
  now: string,
): Promise<{ report: SyncReport; exitCode: number }> {
  const { annotated, filesScanned } = await findAnnotatedFiles(opts);

  const elements: ParsedElement[] = [];
  const relationships: ParsedRelationship[] = [];
  const malformedTags: MalformedTag[] = [];

  for (const file of annotated) {
    const blocks = extractCommentBlocks(file.content);
    for (const block of blocks) {
      const parsed = parseCommentBlock(block, file.relativePath);
      if (parsed.element) elements.push(parsed.element);
      relationships.push(...parsed.relationships);
      malformedTags.push(...parsed.malformed);
    }
  }

  const specificationPath = `${opts.modelDir}/specification.c4`;
  const manualDir = `${opts.modelDir}/manual`;
  const generatedDir = `${opts.modelDir}/generated`;
  const elementsFile = `${generatedDir}/elements.c4`;
  const relationshipsFile = `${generatedDir}/relationships.c4`;

  const { spec, declaredIds: specDeclaredIds } = readSpecification(specificationPath);
  const manualDeclaredIds = await readManualIds(manualDir);

  const resolved = resolveModel(elements, relationships, spec, [
    ...specDeclaredIds,
    ...manualDeclaredIds,
  ]);

  const previousElements = readPreviousElements(elementsFile);
  const previousRelationships = readPreviousRelationships(relationshipsFile);

  const previousElementsContent = existsSync(elementsFile) ? readFileSync(elementsFile, "utf8") : "";
  const previousRelationshipsContent = existsSync(relationshipsFile)
    ? readFileSync(relationshipsFile, "utf8")
    : "";

  const newElementsContent = emitElements(resolved.validElements);
  const newRelationshipsContent = emitRelationships(resolved.validRelationships);

  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(elementsFile, newElementsContent, "utf8");
  writeFileSync(relationshipsFile, newRelationshipsContent, "utf8");

  const changed =
    newElementsContent !== previousElementsContent ||
    newRelationshipsContent !== previousRelationshipsContent;

  const validate = opts.validate
    ? await runLikeC4Validate(opts.cwd)
    : { ran: false, passed: null };

  const report = buildReport({
    repoRoot: opts.cwd,
    modelDir: opts.modelDir,
    filesScanned,
    filesWithAnnotations: annotated.length,
    resolved,
    malformedTags,
    previousElements,
    previousRelationships,
    elementsFile: relative(opts.cwd, elementsFile),
    relationshipsFile: relative(opts.cwd, relationshipsFile),
    changed,
    validate,
    manualDirConfirmed: true,
    viewsDirConfirmed: true,
    now,
  });

  const exitCode = !opts.validate ? 0 : validate.passed ? 0 : 1;
  return { report, exitCode };
}
