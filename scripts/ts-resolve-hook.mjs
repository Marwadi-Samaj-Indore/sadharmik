/**
 * Lets plain `node` run the app's .ts modules, which import each other
 * without file extensions the way bundlers allow.
 *
 * Used only by scripts/check-logic.ts.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(pathToFileURL(import.meta.filename), {
  parentURL: import.meta.url,
});

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw error;
  }
}
