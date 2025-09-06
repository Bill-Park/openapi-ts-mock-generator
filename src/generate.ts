import { parseSchema, specialFakerParser } from "./parsers"
import { getOpenAPIDocsDeref, getOpenAPIDocsBundle } from "./parsers"
import {
  HttpMethods,
  Options,
  PathNormalizedType,
  ResponseSchemaType,
  SchemaOutputType,
  isNotNullish,
} from "./core"
import { resolveFilePath } from "./utils"
import { isReference } from "oazapfts/generate"

export const generateSchema = async (options: Options) => {
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  const doc = await getOpenAPIDocsDeref(openapiPath)
  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    console.warn("No schemas found")
    return
  }

  const specialFakers = specialFakerParser(options)
  return Object.entries(sampleSchemas).reduce((acc, [schemaName, schema]) => {
    acc[schemaName] = parseSchema(schema, specialFakers, options, {}) as SchemaOutputType
    return acc
  }, {} as Record<string, SchemaOutputType>)
}

export const generateAPI = async (options: Options) => {
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  const doc = await getOpenAPIDocsBundle(openapiPath)

  const samplePaths = doc?.paths
  if (samplePaths === undefined) {
    console.warn("No paths found")
    return
  }

  const specialFakers = specialFakerParser(options)
  const normalizedPaths = Object.entries(samplePaths).reduce((acc, [apiName, api]) => {
    if (api === undefined) return acc
    const paths = Object.values(HttpMethods)
      .map((method) => {
        if (api[method] === undefined) return
        const responses = Object.entries(api[method]?.responses ?? [])
          .map(([statusCode, response]) => {
            if (isReference(response)) return undefined
            if (options.includeCodes && !options.includeCodes.includes(parseInt(statusCode)))
              return undefined
            const schema = response.content?.["application/json"]?.schema ?? {}
            const compositeSchema = (() => {
              if ("oneOf" in schema) {
                return {
                  type: "oneOf",
                  value: schema,
                } as ResponseSchemaType
              }
              if ("anyOf" in schema) {
                return {
                  type: "anyOf",
                  value: schema,
                } as ResponseSchemaType
              }
              if ("type" in schema && "items" in schema && schema.type === "array") {
                return {
                  type: "array",
                  value: schema.items,
                } as ResponseSchemaType
              }
              // Todo: can't find sample data
              // if ("allOf" in schema) {
              //   return parseSchema(schema, {})
              // }
              if (isReference(schema)) return { type: "ref", value: schema } as ResponseSchemaType
              if (Object.keys(schema).length === 0) {
                // empty object return undefined
                return undefined
              }
              return parseSchema(schema ?? {}, specialFakers, options, {})
            })()

            return {
              statusCode: parseInt(statusCode),
              description: response.description,
              schema: compositeSchema,
            }
          })
          .filter(isNotNullish)

        return {
          pathname: apiName.replace(/{/g, ":").replace(/}/g, ""),
          operationId: api[method]?.operationId ?? "",
          summary: api[method]?.summary ?? "",
          tags: api[method]?.tags ?? ["default"],
          method,
          responses,
        } as PathNormalizedType
      })
      .filter(isNotNullish)

    return [...acc, ...paths]
  }, [] as PathNormalizedType[])

  return normalizedPaths
}
