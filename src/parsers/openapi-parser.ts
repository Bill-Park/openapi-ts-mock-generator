/**
 * OpenAPI 문서 파싱 관련 유틸리티
 */

import SwaggerParser from "@apidevtools/swagger-parser"
import { OpenAPIV3_1 } from "openapi-types"

/**
 * OpenAPI 문서를 역참조(dereference)하여 로드
 * 모든 $ref를 실제 스키마로 해석하여 반환
 */
export const getOpenAPIDocsDeref = async (
  path: string
): Promise<OpenAPIV3_1.Document | undefined> => {
  const doc = await SwaggerParser.dereference(path)
  const isOpenApiV3 = "openapi" in doc && doc.openapi.startsWith("3")
  if (isOpenApiV3) return doc as OpenAPIV3_1.Document
  return undefined
}

/**
 * OpenAPI 문서를 번들(bundle)하여 로드
 * 외부 참조를 포함하여 하나의 문서로 통합
 */
export const getOpenAPIDocsBundle = async (
  path: string
): Promise<OpenAPIV3_1.Document | undefined> => {
  const doc = await SwaggerParser.bundle(path)
  const isOpenApiV3 = "openapi" in doc && doc.openapi.startsWith("3")
  if (isOpenApiV3) return doc as OpenAPIV3_1.Document
  return undefined
}

/**
 * OpenAPI 문서의 유효성을 검증
 */
export const validateOpenAPIDoc = async (path: string): Promise<boolean> => {
  try {
    await SwaggerParser.validate(path)
    return true
  } catch (error) {
    console.error("OpenAPI validation failed:", error)
    return false
  }
}

/**
 * OpenAPI 문서에서 스키마 컴포넌트 추출
 */
export const extractSchemas = (
  doc: OpenAPIV3_1.Document
): Record<string, OpenAPIV3_1.SchemaObject> => {
  return doc.components?.schemas || {}
}

/**
 * OpenAPI 문서에서 경로 정보 추출
 */
export const extractPaths = (doc: OpenAPIV3_1.Document): OpenAPIV3_1.PathsObject => {
  return doc.paths || {}
}

/**
 * OpenAPI 버전 확인
 */
export const getOpenAPIVersion = (doc: any): string => {
  return doc.openapi || doc.swagger || "unknown"
}
