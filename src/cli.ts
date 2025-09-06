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
      default: undefined,
    }
  )
  .option("-m, --array-min-length <length>", "Minimum array length.", {
    default: "1",
  })
  .option("-M, --array-max-length <length>", "Maximum array length.", {
    default: "3",
  })

  .option("--special-path <specialPath>", "Generate special faker functions.", {
    default: undefined,
  })
  .option("--handler-url <handlerUrl>", "URL for the generated handlers", {
    default: "*",
  })
  .option("-l, --locales <locales>", "Comma separated list of locales for faker.", {
    default: "ko",
  })
  .option("-s, --static", "Generate static mocks.", {
    default: false,
  })
  .option("-t, --generate-target <targets>", "Comma separated list of targets to generate.", {
    default: "api,schema",
  })
  .option("--clear", "Clear response and handlers directory before generate files.", {
    default: false,
  })
  .option("--optional", "Generate optional mocks.", {
    default: false,
  })
  .example("openapi-ts-mock-generator ./openapi.json")
  .example("openapi-ts-mock-generator http://127.0.0.1/openapi.json")
  .action(async (path, userOptions) => {
    const options: Options = {
      path: path,
      ...userOptions,
      isStatic: userOptions.static,
      fakerLocale: userOptions.locales,
      includeCodes: userOptions.includeCodes
        ? userOptions.includeCodes
            .toString()
            .split(",")
            .map((code: string) => parseInt(code))
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
