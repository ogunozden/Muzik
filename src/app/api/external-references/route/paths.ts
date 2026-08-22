import path from "node:path";

import {PROJECT_ROOT} from "../route-config";

export function toProjectRelativePath(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join("/");
}
