#!/usr/bin/env node
import cac from "cac"

const cli = cac()

cli
  .command("<path>", "Generating msw mock definitions with random fake data.")
  .option("-b, --base-dir <baseDir>", "Base directory for the generated files.", {
    default: ".",
  })
  .option(
    "-c, --include-codes <codes>",
    "Comma separated list of status codes to generate responses for."
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
  .example("openapi-ts-mock-generator ./openapi.json")
  .example("openapi-ts-mock-generator http://127.0.0.1/openapi.json")
  .action((spec, options) => {
    console.log("🚀 ~ .action ~ options:", spec, options)
  })

cli.help()

try {
  cli.parse()
} catch (error) {
  console.log("check help with --help flag")
}
