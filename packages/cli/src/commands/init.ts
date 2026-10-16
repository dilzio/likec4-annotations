import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { InitOptions } from "../types.js";

export interface InitResult {
  exitCode: number;
  error?: string;
  modelDir?: string;
}

const SPECIFICATION_C4 = `specification {
  element person {
    style {
      shape person
    }
  }
  element softwareSystem
  element container
  element component

  relationship async {
    line dashed
  }

  tag external
}
`;

const LANDSCAPE_VIEW_C4 = `views {
  view landscape {
    title 'System Landscape'
    include *
  }
}
`;

const EXTERNAL_SYSTEMS_C4 = `// Hand-authored, external systems and cross-cutting relationships not
// discovered from code annotations. The \`sync\` command never writes to
// this file.
//
// Declare external systems like:
//   stripe-api = softwareSystem 'Stripe API' {
//     #external
//     description 'Third-party payment processor.'
//   }
//
// Cross-cutting relationships not owned by any single annotated file can
// also be declared here, e.g.:
//   orders-service -> stripe-api 'charges the card'
model {
}
`;

export function runInit(opts: InitOptions): InitResult {
  const modelDir = join(opts.rootDir, "c4-agent");

  if (existsSync(modelDir)) {
    return {
      exitCode: 1,
      error: `${modelDir} already exists; likec4-agent init refuses to overwrite an existing project`,
    };
  }

  mkdirSync(join(modelDir, "views"), { recursive: true });
  mkdirSync(join(modelDir, "manual"), { recursive: true });

  writeFileSync(join(modelDir, "specification.c4"), SPECIFICATION_C4, "utf8");
  writeFileSync(join(modelDir, "views", "landscape.c4"), LANDSCAPE_VIEW_C4, "utf8");
  writeFileSync(join(modelDir, "manual", "external-systems.c4"), EXTERNAL_SYSTEMS_C4, "utf8");

  return { exitCode: 0, modelDir };
}
