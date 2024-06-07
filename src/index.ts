import { generateAPI, generateSchema } from "./generate"
import { Options } from "./types"
import { writeHandlers, writeResponses, writeSchema } from "./writer"

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
  writeHandlers(generatedAPI, options)
  writeResponses(generatedAPI, options)
  writeSchema(generatedSchema, options)
}
