import { generateAPI, generateSchema } from "./generate"
import { Options } from "./types"
import { writeFaker, writeHandlers, writeResponses, writeSchema } from "./writer"
import { existsSync, mkdirSync } from "fs"

export const main = async (options: Options) => {
  const generatedAPI = await generateAPI(options)
  if (generatedAPI === undefined) {
    console.warn("generate api fail")
    return
  }

  const generatedSchema = await generateSchema(options)
  if (generatedSchema === undefined) {
    console.warn("generate schema fail")
    return
  }

  if (options.baseDir && !existsSync(options.baseDir)) {
    mkdirSync(options.baseDir, { recursive: true })
  }

  if (options.static === false) writeFaker(options)
  writeHandlers(generatedAPI, options)
  writeResponses(generatedAPI, options)
  writeSchema(generatedSchema, options)
}
