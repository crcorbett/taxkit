import { Function as EffectFunction, Record, Schema } from "effect";

export const NativeMcpResumeProgress = Schema.Struct({
  attempts: Schema.Number,
  completed: Schema.Number,
  errors: Schema.Array(Schema.String),
});
// Test-only native observation boundary. Preserve the exact native callback,
// this/arguments, return value and thrown error; never catch-and-suppress or
// change ALS selection. The host requires a synchronous callback, so the
// in-memory probe uses counters inside its disposable Worker. No production
// source or on-disk artifact is changed. Ordinary Miniflare log hooks miss this
// failure because it happens before Effect's interpreter enters its catch.
export const nativeMcpResumeFixture = (
  modules: Record.ReadonlyRecord<
    string,
    {
      readonly contents: string;
      readonly type: "esm";
    }
  >
) => ({
  ...EffectFunction.pipe(
    modules,
    Record.map((module) => ({
      ...module,
      contents: module.contents.replaceAll(
        /(?<receiver>[\w$]+)\.runInAsyncScope\(this\.evaluate,this,/gu,
        (_, receiver: string) =>
          `globalThis.__taxkitNativeResume(${receiver},this.evaluate,this,`
      ),
    }))
  ),
  "mcp-resume-probe.js": {
    contents: `import Original from './worker.js';
const progress = { attempts: 0, completed: 0, errors: [] };
globalThis.__taxkitNativeResume = (resource, evaluate, fiber, argument) => {
  progress.attempts++;
  try {
    const result = resource.runInAsyncScope(evaluate, fiber, argument);
    progress.completed++;
    return result;
  } catch (error) {
    progress.errors.push(String(error));
    throw error;
  }
};
export default class NativeMcpProbe extends Original {
  constructor(context, env) {
    super(context, env);
    const fetch = this.fetch.bind(this);
    this.fetch = (request) => new URL(request.url).pathname === '/__mcp_resume_progress'
      ? Promise.resolve(Response.json(progress))
      : fetch(request);
  }
}`,
    type: "esm" as const,
  },
});
