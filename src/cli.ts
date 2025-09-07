#!/usr/bin/env node
import { main } from "."
import { defaultOptions, transformCliOptions } from "./core"
import cac from "cac"

const cli = cac()

cli
  .command("<path>", "Generating msw mock definitions with random fake data.")
  .option("-b, --base-dir <baseDir>", "Base directory for the generated files.", {})
  .option(
    "-c, --include-codes <codes>",
    "Comma separated list of status codes to generate responses for.",
    {
      default: defaultOptions.includeCodes,
    }
  )
  .option("-m, --array-min-length <length>", "Minimum array length.", {
    default: defaultOptions.arrayMinLength,
  })
  .option("-M, --array-max-length <length>", "Maximum array length.", {
    default: defaultOptions.arrayMaxLength,
  })

  .option("--special-path <specialPath>", "Generate special faker functions.", {
    default: defaultOptions.specialPath,
  })
  .option("--handler-url <handlerUrl>", "URL for the generated handlers", {
    default: defaultOptions.handlerUrl,
  })
  .option("-l, --locales <locales>", "Comma separated list of locales for faker.", {
    default: defaultOptions.fakerLocale,
  })
  .option("-t, --generate-target <targets>", "Comma separated list of targets to generate.", {
    default: defaultOptions.generateTarget,
  })
  .option("--clear", "Clear response and handlers directory before generate files.", {
    default: defaultOptions.clear,
  })
  .option("-s, --static", "Generate static mocks.", {
    default: defaultOptions.isStatic,
  })
  .option("--optional", "Generate optional mocks.", {
    default: defaultOptions.isOptional,
  })
  .option("--single-line", "Generate single line mocks.", {
    default: defaultOptions.isSingleLine,
  })
  .example("openapi-ts-mock-generator ./openapi.json")
  .example("openapi-ts-mock-generator http://127.0.0.1/openapi.json")
  .action(async (path, userOptions) => {
    const options = transformCliOptions({
      path,
      ...userOptions,
    })
    await main(options)
  })

cli.help()

try {
  cli.parse()
} catch (error) {
  console.log("check help with --help flag")
}
