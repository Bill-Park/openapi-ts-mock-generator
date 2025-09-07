/**
 * API 경로 정보 생성 로직
 * OpenAPI 문서에서 경로 정보를 추출하고 정규화하여 반환
 */

import {
  HttpMethods,
  Options,
  PathNormalizedType,
  ResponseSchemaType,
  SchemaOutputType,
  isNotNullish,
} from "../core"
import { resolveFilePath } from "../utils"
import { getOpenAPIDocsBundle, parseSchema, specialFakerParser } from "../parsers"
import { isReference } from "oazapfts/generate"

/**
 * OpenAPI 문서에서 API 경로 정보를 생성
 * 모든 경로와 메서드를 분석하여 정규화된 형태로 반환
 */
export const generateAPI = async (options: Options): Promise<PathNormalizedType[] | undefined> => {
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  const doc = await getOpenAPIDocsBundle(openapiPath)

  const samplePaths = doc?.paths
  if (samplePaths === undefined) {
    console.warn("No paths found")
    return undefined
  }

  const specialFakers = specialFakerParser(options)
  const normalizedPaths = Object.entries(samplePaths).reduce((acc, [apiName, api]) => {
    if (api === undefined) return acc

    const paths = Object.values(HttpMethods)
      .map((method) => {
        if (api[method] === undefined) return undefined

        const responses = Object.entries(api[method]?.responses ?? [])
          .map(([statusCode, response]) => {
            if (isReference(response)) return undefined
            if (options.includeCodes && !options.includeCodes.includes(parseInt(statusCode)))
              return undefined

            const schema = response.content?.["application/json"]?.schema ?? {}
            const compositeSchema = createCompositeSchema(schema, specialFakers, options)

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

/**
 * 스키마에서 복합 스키마 타입을 생성
 */
const createCompositeSchema = (
  schema: any,
  specialFakers: ReturnType<typeof specialFakerParser>,
  options: Options
): ResponseSchemaType => {
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

  if (isReference(schema)) {
    return { type: "ref", value: schema } as ResponseSchemaType
  }

  if (Object.keys(schema).length === 0) {
    // empty object return undefined
    return undefined
  }

  return parseSchema(schema ?? {}, specialFakers, options, {}) as ResponseSchemaType
}

/**
 * API 경로에서 고유한 태그 목록 추출
 */
export const extractUniqueTags = (paths: PathNormalizedType[]): string[] => {
  return Array.from(new Set(paths.map((path) => path.tags[0])))
}

/**
 * 특정 태그에 해당하는 경로들만 필터링
 */
export const filterPathsByTag = (
  paths: PathNormalizedType[],
  tag: string
): PathNormalizedType[] => {
  return paths.filter((path) => path.tags.includes(tag))
}

/**
 * HTTP 메서드별로 경로들을 그룹화
 */
export const groupPathsByMethod = (
  paths: PathNormalizedType[]
): Record<HttpMethods, PathNormalizedType[]> => {
  return paths.reduce((acc, path) => {
    if (!acc[path.method]) {
      acc[path.method] = []
    }
    acc[path.method].push(path)
    return acc
  }, {} as Record<HttpMethods, PathNormalizedType[]>)
}

/**
 * 경로에서 사용된 모든 스키마 참조 추출
 */
export const extractSchemaReferences = (paths: PathNormalizedType[]): string[] => {
  const refs = new Set<string>()

  paths.forEach((path) => {
    path.responses.forEach((response) => {
      if (response.schema?.type === "ref") {
        refs.add(response.schema.value.$ref)
      }
    })
  })

  return Array.from(refs)
}
