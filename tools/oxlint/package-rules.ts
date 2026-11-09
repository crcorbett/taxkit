// Repository package-role policy. Each rule lives in its own file under rules/.
import { workspaceRoles } from "./rules/workspace-roles.ts";

export default {
  meta: { name: "taxkit-package" },
  rules: { "workspace-roles": workspaceRoles },
};
