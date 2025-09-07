/**
 * 스키마 모킹 데이터 생성 로직
 * OpenAPI 스키마 컴포넌트에서 모킹 데이터를 생성
 */

import { Options, SchemaOutputType } from "../core"
import { resolveFilePath } from "../utils"
import { getOpenAPIDocsDeref, parseSchema, specialFakerParser } from "../parsers"

/**
 * OpenAPI 문서에서 스키마 모킹 데이터를 생성
 * 모든 스키마 컴포넌트를 분석하여 실제 모킹 데이터로 변환
 */
export const generateSchema = async (
  options: Options
): Promise<Record<string, SchemaOutputType> | undefined> => {
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  const doc = await getOpenAPIDocsDeref(openapiPath)

  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    console.warn("No schemas found")
    return undefined
  }

  const specialFakers = specialFakerParser(options)
  return Object.entries(sampleSchemas).reduce((acc, [schemaName, schema]) => {
    acc[schemaName] = parseSchema(schema, specialFakers, options, {}) as SchemaOutputType
    return acc
  }, {} as Record<string, SchemaOutputType>)
}

/**
 * 특정 스키마만 선택적으로 생성
 */
export const generateSpecificSchemas = async (
  options: Options,
  schemaNames: string[]
): Promise<Record<string, SchemaOutputType> | undefined> => {
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  const doc = await getOpenAPIDocsDeref(openapiPath)

  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    console.warn("No schemas found")
    return undefined
  }

  const specialFakers = specialFakerParser(options)
  const filteredSchemas = Object.entries(sampleSchemas).filter(([schemaName]) =>
    schemaNames.includes(schemaName)
  )

  return filteredSchemas.reduce((acc, [schemaName, schema]) => {
    acc[schemaName] = parseSchema(schema, specialFakers, options, {}) as SchemaOutputType
    return acc
  }, {} as Record<string, SchemaOutputType>)
}

/**
 * 스키마 의존성 분석
 * 어떤 스키마가 다른 스키마를 참조하는지 분석
 */
export const analyzeSchemaDependencies = async (
  options: Options
): Promise<Record<string, string[]>> => {
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  const doc = await getOpenAPIDocsDeref(openapiPath)

  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    return {}
  }

  const dependencies: Record<string, string[]> = {}

  Object.entries(sampleSchemas).forEach(([schemaName, schema]) => {
    dependencies[schemaName] = extractSchemaReferences(schema)
  })

  return dependencies
}

/**
 * 스키마에서 참조하는 다른 스키마들을 추출
 */
const extractSchemaReferences = (schema: any): string[] => {
  const refs: string[] = []

  const extractFromObject = (obj: any) => {
    if (typeof obj !== "object" || obj === null) return

    if (obj.$ref && typeof obj.$ref === "string") {
      const refName = obj.$ref.replace("#/components/schemas/", "")
      refs.push(refName)
      return
    }

    Object.values(obj).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach(extractFromObject)
      } else {
        extractFromObject(value)
      }
    })
  }

  extractFromObject(schema)
  return refs
}

/**
 * 사용 가능한 모든 스키마 이름 목록 반환
 */
export const getAvailableSchemas = async (options: Options): Promise<string[]> => {
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  const doc = await getOpenAPIDocsDeref(openapiPath)

  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    return []
  }

  return Object.keys(sampleSchemas)
}

/**
 * 스키마 크기 정보 (프로퍼티 개수)
 */
export const getSchemaStats = async (
  options: Options
): Promise<Record<string, { properties: number; required: number }>> => {
  const openapiPath = resolveFilePath(options.path, options.baseDir)
  const doc = await getOpenAPIDocsDeref(openapiPath)

  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    return {}
  }

  const stats: Record<string, { properties: number; required: number }> = {}

  Object.entries(sampleSchemas).forEach(([schemaName, schema]) => {
    if (typeof schema === "object" && schema.type === "object") {
      stats[schemaName] = {
        properties: schema.properties ? Object.keys(schema.properties).length : 0,
        required: schema.required ? schema.required.length : 0,
      }
    }
  })

  return stats
}
