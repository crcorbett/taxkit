export const directBunVersion = Bun.version;

const { version: destructuredBunVersion } = Bun;
let assignedBunVersion = "";
({ version: assignedBunVersion } = Bun);

export const assignedBunVersionSnapshot = assignedBunVersion;
export { destructuredBunVersion };
