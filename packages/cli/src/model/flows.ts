import type { ParsedRelationship } from "../types.js";

export interface Flow {
  id: string;
  title: string;
  steps: ParsedRelationship[];
}

export interface FlowWarning {
  flowId: string;
  message: string;
}

export interface BuildFlowsResult {
  flows: Flow[];
  warnings: FlowWarning[];
}

export function buildFlows(validRelationships: ParsedRelationship[]): BuildFlowsResult {
  const groups = new Map<string, ParsedRelationship[]>();
  for (const rel of validRelationships) {
    if (rel.flow === undefined) continue;
    const group = groups.get(rel.flow);
    if (group) {
      group.push(rel);
    } else {
      groups.set(rel.flow, [rel]);
    }
  }

  const flows: Flow[] = [];
  const warnings: FlowWarning[] = [];

  for (const [flowId, members] of groups) {
    const { title, titleWarning } = resolveTitle(flowId, members);
    if (titleWarning) warnings.push(titleWarning);

    const { steps, stepWarnings } = orderSteps(flowId, members);
    warnings.push(...stepWarnings);

    flows.push({ id: flowId, title, steps });
  }

  return { flows, warnings };
}

function resolveTitle(
  flowId: string,
  members: ParsedRelationship[],
): { title: string; titleWarning: FlowWarning | null } {
  const titled = members.filter((m) => m.flowTitle !== undefined);
  if (titled.length === 0) {
    return { title: flowId, titleWarning: null };
  }
  const title = titled[0].flowTitle as string;
  const distinctTitles = new Set(titled.map((m) => m.flowTitle));
  if (distinctTitles.size > 1) {
    return {
      title,
      titleWarning: {
        flowId,
        message: `flow "${flowId}" has conflicting flowTitle values (${[...distinctTitles]
          .map((t) => `"${t}"`)
          .join(", ")}); using the first occurrence "${title}"`,
      },
    };
  }
  return { title, titleWarning: null };
}

function orderSteps(
  flowId: string,
  members: ParsedRelationship[],
): { steps: ParsedRelationship[]; stepWarnings: FlowWarning[] } {
  const sorted = [...members].sort((a, b) => {
    return (
      (a.step as number) - (b.step as number) ||
      a.sourceFile.localeCompare(b.sourceFile) ||
      a.sourceLine - b.sourceLine
    );
  });

  const stepWarnings: FlowWarning[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].step === sorted[i - 1].step) {
      stepWarnings.push({
        flowId,
        message: `flow "${flowId}" has duplicate step ${sorted[i].step} (${sorted[i - 1].sourceFile}:${sorted[i - 1].sourceLine} and ${sorted[i].sourceFile}:${sorted[i].sourceLine}); ordering tiebroken by source file, then line`,
      });
    }
  }

  return { steps: sorted, stepWarnings };
}
