import { Options, SchemaOutputType } from "./types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { OpenAPIV3_1 } from "openapi-types"
import { defaultOptions } from "./defaults"
import { parseSchema } from "./parser"

export const generate = async (options: Options = defaultOptions) => {
  if (!options.path) {
    console.warn("No path provided")
    return
  }
  const doc = await getOpenAPIDocs(options.path)

  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    console.warn("No schemas found")
    return
  }

  return Object.entries(sampleSchemas).reduce(
    (acc, [schemaName, schema]) => {
      const rootSchema = {} as Record<string, SchemaOutputType>
      acc[schemaName] = parseSchema(schema, rootSchema) as SchemaOutputType
      return acc
    },
    {} as Record<string, SchemaOutputType>
  )
}

const getOpenAPIDocs = async (path: string) => {
  const doc = await SwaggerParser.dereference(path)
  const isOpenApiV3 = "openapi" in doc && doc.openapi.startsWith("3")
  if (isOpenApiV3) return doc as OpenAPIV3_1.Document
  return
}
