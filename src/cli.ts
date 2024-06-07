#!/usr/bin/env node
import { main } from "."
import { Options } from "./types"
import cac from "cac"

const cli = cac()

cli
  .command("<path>", "Generating msw mock definitions with random fake data.")
  .option("-b, --base-dir <baseDir>", "Base directory for the generated files.", {
    default: ".",
  })
  .option(
    "-c, --include-codes <codes>",
    "Comma separated list of status codes to generate responses for.",
    {
      default: "",
    }
  )
  .option("-m, --array-min-length <length>", "Minimum array length.", {
    default: "1",
  })
  .option("-M, --array-max-length <length>", "Maximum array length.", {
    default: "3",
  })
  .option("-s, --static", "Generate static mocks.", {
    default: false,
  })
  .option("-sp, --special-path", "Generate special faker functions.", {
    default: undefined,
  })
  .option("--handler-url", "URL for the generated handlers", {
    default: "*",
  })
  .example("openapi-ts-mock-generator ./openapi.json")
  .example("openapi-ts-mock-generator http://127.0.0.1/openapi.json")
  .action(async (path, userOptions) => {
    const options: Options = {
      path: path,
      baseDir: userOptions.baseDir,
      arrayMinLength: userOptions.arrayMinLength,
      arrayMaxLength: userOptions.arrayMaxLength,
      static: userOptions.static,
      specialPath: userOptions.special,
      handlerUrl: userOptions.handlerUrl,
      includeCodes: userOptions.includeCodes
        ? userOptions.includeCodes.split(",").map((code: string) => parseInt(code))
        : undefined,
    }
    await main(options)
  })

cli.help()

try {
  cli.parse()
} catch (error) {
  console.log("check help with --help flag")
}
