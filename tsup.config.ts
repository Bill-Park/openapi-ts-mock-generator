import { Options, defineConfig } from "tsup"

export default defineConfig((options) => {
  const commonOptions: Partial<Options> = {
    entry: ["src/index.ts"],
    dts: true, // Generate declaration file (.d.ts)
    splitting: false,
    sourcemap: true,
    clean: true,
  }

  return [
    {
      ...commonOptions,
      format: ["cjs"],
      target: "es5",
    },
    {
      ...commonOptions,
      format: ["esm"],
      target: "es6",
    },
  ]
})
