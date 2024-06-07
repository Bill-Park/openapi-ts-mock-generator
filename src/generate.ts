import { parseSchema, specialFakerParser } from "./parser"
import {
  HttpMethods,
  Options,
  PathNormalizedType,
  ResponseSchemaType,
  SchemaOutputType,
  isNotNullish,
} from "./types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { isReference } from "oazapfts/generate"
import { OpenAPIV3_1 } from "openapi-types"
import * as path from "path"

const getOpenAPIDocsDeref = async (path: string) => {
  const doc = await SwaggerParser.dereference(path)
  const isOpenApiV3 = "openapi" in doc && doc.openapi.startsWith("3")
  if (isOpenApiV3) return doc as OpenAPIV3_1.Document
  return
}

const getOpenAPIDocsBundle = async (path: string) => {
  const doc = await SwaggerParser.bundle(path)
  const isOpenApiV3 = "openapi" in doc && doc.openapi.startsWith("3")
  if (isOpenApiV3) return doc as OpenAPIV3_1.Document
  return
}

export const generateSchema = async (options: Options) => {
  const openapiPath = options.path.startsWith("http")
    ? options.path
    : path.join(options.baseDir ?? "", options.path)
  const doc = await getOpenAPIDocsDeref(openapiPath)
  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    console.warn("No schemas found")
    return
  }

  const specialFakers = specialFakerParser(options)
  return Object.entries(sampleSchemas).reduce(
    (acc, [schemaName, schema]) => {
      acc[schemaName] = parseSchema(schema, specialFakers, {}) as SchemaOutputType
      return acc
    },
    {} as Record<string, SchemaOutputType>
  )
}

export const generateAPI = async (options: Options) => {
  const openapiPath = options.path.startsWith("http")
    ? options.path
    : path.join(options.baseDir ?? "", options.path)
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
              return parseSchema(schema ?? {}, specialFakers, {})
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
