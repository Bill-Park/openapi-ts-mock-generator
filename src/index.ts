import { generateAPI, generateSchema } from "./generate"
import { Options } from "./core"
import { writeFaker, writeHandlers, writeResponses, writeSchema } from "./writer"
import { existsSync, mkdirSync } from "fs"

export const main = async (options: Options) => {
  if (options.baseDir && !existsSync(options.baseDir)) {
    mkdirSync(options.baseDir, { recursive: true })
  }

  if (options.generateTarget.includes("api")) {
    const generatedAPI = await generateAPI(options)
    if (generatedAPI === undefined) {
      console.warn("generate api fail")
      return
    }
    writeHandlers(generatedAPI, options)
    writeResponses(generatedAPI, options)
  }

  if (options.generateTarget.includes("schema")) {
    const generatedSchema = await generateSchema(options)
    if (generatedSchema === undefined) {
      console.warn("generate schema fail")
      return
    }
    writeSchema(generatedSchema, options)
  }

  if (options.isStatic === false) writeFaker(options)
}
