export interface ParsedElement {
  id: string;
  kind: string;
  title: string;
  technology?: string;
  description?: string;
  sourceFile: string;
  sourceLine: number;
}

export interface ParsedRelationship {
  source: string;
  target: string;
  label: string;
  technology?: string;
  kind?: string;
  sourceFile: string;
  sourceLine: number;
}

export interface MalformedTag {
  sourceFile: string;
  sourceLine: number;
  rawText: string;
}

export interface SpecificationInfo {
  elementKinds: Set<string>;
  relationshipKinds: Set<string>;
}

export interface SyncOptions {
  cwd: string;
  modelDir: string;
  include: string[];
  exclude: string[];
  format: "json" | "text";
  validate: boolean;
}

export interface SyncReport {
  schemaVersion: 1;
  timestamp: string;
  repoRoot: string;
  modelDir: string;
  scan: {
    filesScanned: number;
    filesWithAnnotations: number;
  };
  elements: {
    total: number;
    new: Array<{ id: string; kind: string; sourceFile: string; sourceLine: number }>;
    orphaned: Array<{ id: string; kind: string }>;
  };
  relationships: {
    total: number;
    added: Array<{
      source: string;
      target: string;
      label: string;
      sourceFile: string;
      sourceLine: number;
    }>;
    removed: Array<{ source: string; target: string; label: string }>;
  };
  issues: {
    danglingTargets: Array<{
      source: string;
      target: string;
      label: string;
      sourceFile: string;
      sourceLine: number;
    }>;
    undeclaredKinds: Array<{
      id: string;
      kind: string;
      sourceFile: string;
      sourceLine: number;
      context: "element" | "relationship";
    }>;
    malformedTags: MalformedTag[];
  };
  write: {
    elementsFile: string;
    relationshipsFile: string;
    changed: boolean;
  };
  validate: {
    ran: boolean;
    passed: boolean | null;
    rawOutput?: string;
    exitCode?: number;
  };
  untouched: {
    manualDirConfirmed: boolean;
    viewsDirConfirmed: boolean;
  };
}
