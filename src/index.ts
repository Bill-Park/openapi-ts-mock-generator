import { defaultOptions } from "./defaults"
import { generateAPI, generateSchema } from "./generate"
import { Options } from "./types"
import { writeHandlers, writeResponses, writeSchema } from "./writer"

async function main() {
  const options: Options = {
    ...defaultOptions,
    path: "resources/openapi.json", // file path or url
    static: true,
    baseDir: "resources",
    // includeCodes: [200, 201, 202, 204],
  }
  const generatedAPI = await generateAPI(options)
  if (generatedAPI === undefined) {
    console.warn("generate api fail")
    return
  }
  writeHandlers(generatedAPI, options)
  writeResponses(generatedAPI, options)

  const generatedSchema = await generateSchema(options)
  if (generatedSchema === undefined) {
    console.warn("generate schema fail")
    return
  }
  writeSchema(generatedSchema, options)
}

main()
