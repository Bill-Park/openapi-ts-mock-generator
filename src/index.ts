import { generateAPI, generateSchema } from "./generators"
import { Options } from "./core"
import {
  generateResponses,
  generateHandlers,
  generateSchemaFile,
  generateFaker,
} from "./generators"
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
    generateHandlers(generatedAPI, options)
    await generateResponses(generatedAPI, options)
  }

  if (options.generateTarget.includes("schema")) {
    const generatedSchema = await generateSchema(options)
    if (generatedSchema === undefined) {
      console.warn("generate schema fail")
      return
    }
    generateSchemaFile(generatedSchema, options)
  }

  if (options.isStatic === false) generateFaker(options)
}
