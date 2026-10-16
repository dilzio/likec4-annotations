import type { SyncReport } from "../types.js";

export function formatHuman(report: SyncReport): string {
  const lines: string[] = [];

  lines.push("## likec4-agent sync summary");
  lines.push("");

  lines.push("**New elements:**");
  if (report.elements.new.length === 0) {
    lines.push("none");
  } else {
    for (const e of report.elements.new) {
      lines.push(`- ${e.id} (${e.kind}) — ${e.sourceFile}:${e.sourceLine}`);
    }
  }
  lines.push("");

  lines.push("**Orphaned elements** (annotation gone, not necessarily deleted):");
  if (report.elements.orphaned.length === 0) {
    lines.push("none");
  } else {
    for (const e of report.elements.orphaned) {
      lines.push(`- ${e.id} (${e.kind})`);
    }
  }
  lines.push("");

  lines.push("**Relationships added:**");
  if (report.relationships.added.length === 0) {
    lines.push("none");
  } else {
    for (const r of report.relationships.added) {
      lines.push(`- ${r.source} -> ${r.target} "${r.label}" — ${r.sourceFile}:${r.sourceLine}`);
    }
  }
  lines.push("");

  lines.push("**Relationships removed:**");
  if (report.relationships.removed.length === 0) {
    lines.push("none");
  } else {
    for (const r of report.relationships.removed) {
      lines.push(`- ${r.source} -> ${r.target} "${r.label}"`);
    }
  }
  lines.push("");

  lines.push("**Flows (dynamic views) generated:**");
  if (report.flows.length === 0) {
    lines.push("none");
  } else {
    for (const f of report.flows) {
      lines.push(`- ${f.id} ("${f.title}") — ${f.stepCount} step(s)`);
    }
  }
  lines.push("");

  if (report.issues.flowWarnings.length > 0) {
    lines.push("**Flow warnings:**");
    for (const w of report.issues.flowWarnings) {
      lines.push(`- ${w.flowId}: ${w.message}`);
    }
    lines.push("");
  }

  lines.push("**Dangling relationship targets (omitted):**");
  if (report.issues.danglingTargets.length === 0) {
    lines.push("none");
  } else {
    for (const d of report.issues.danglingTargets) {
      lines.push(
        `- ${d.source} -> ${d.target} "${d.label}" — ${d.sourceFile}:${d.sourceLine} (target id not declared anywhere)`,
      );
    }
  }
  lines.push("");

  lines.push("**Undeclared kinds (omitted):**");
  if (report.issues.undeclaredKinds.length === 0) {
    lines.push("none");
  } else {
    for (const u of report.issues.undeclaredKinds) {
      lines.push(
        `- ${u.id} uses undeclared ${u.context} kind "${u.kind}" — ${u.sourceFile}:${u.sourceLine}`,
      );
    }
  }
  lines.push("");

  if (report.issues.malformedTags.length > 0) {
    lines.push("**Malformed tag lines (skipped):**");
    for (const m of report.issues.malformedTags) {
      lines.push(`- ${m.sourceFile}:${m.sourceLine} — \`${m.rawText}\``);
    }
    lines.push("");
  }

  lines.push(
    `**likec4 validate:** ${
      !report.validate.ran
        ? "skipped (--no-validate)"
        : report.validate.passed
          ? "✓ pass"
          : "✗ FAIL"
    }`,
  );
  if (report.validate.ran && !report.validate.passed && report.validate.rawOutput) {
    lines.push("");
    lines.push("```");
    lines.push(report.validate.rawOutput.trim());
    lines.push("```");
  }
  lines.push("");

  lines.push(
    `**c4-agent/manual/** and c4-agent/views/** untouched:** ${
      report.untouched.manualDirConfirmed && report.untouched.viewsDirConfirmed ? "confirmed" : "could not confirm"
    }`,
  );
  lines.push("");
  lines.push("Nothing was committed — review the diff yourself.");

  return lines.join("\n");
}
