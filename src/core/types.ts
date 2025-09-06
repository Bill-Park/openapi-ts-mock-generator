import { OpenAPIV3_1 } from "openapi-types"

/**
 * 메인 옵션 타입
 * CLI 및 프로그래매틱 API에서 사용되는 모든 설정을 포함
 */
export type Options = {
  path: string
  arrayMinLength?: number
  arrayMaxLength?: number
  isStatic: boolean
  includeCodes?: number[]
  baseDir?: string
  specialPath?: string
  handlerUrl: string
  fakerLocale: string
  generateTarget: string
  clear?: boolean
  optional?: boolean
}

/**
 * 스키마 출력 기본 타입
 */
export type SchemaOutputType = string | number | boolean | null | undefined | Date

/**
 * 중첩된 스키마 출력 타입 (재귀적)
 */
type NestedSchemaOutputType<T> =
  | {
      [K in keyof T]: T[K] extends object ? NestedSchemaOutputType<T[K]> : T[K]
    }
  | SchemaOutputType
  | {}

/**
 * 파싱된 스키마 타입
 */
export type ParseSchemaType = NestedSchemaOutputType<string>

/**
 * HTTP 메서드 열거형
 */
export enum HttpMethods {
  GET = "get",
  PUT = "put",
  POST = "post",
  DELETE = "delete",
  OPTIONS = "options",
  HEAD = "head",
  PATCH = "patch",
  TRACE = "trace",
}

/**
 * 응답 스키마 타입 정의
 */
export type ResponseSchemaType =
  | {
      type: "anyOf" | "oneOf" | "array"
      value: OpenAPIV3_1.SchemaObject
    }
  | {
      type: "ref"
      value: OpenAPIV3_1.ReferenceObject
    }
  | undefined

/**
 * 정규화된 경로 타입
 * OpenAPI 경로 정보를 내부에서 사용하기 쉬운 형태로 변환한 타입
 */
export type PathNormalizedType = {
  pathname: string
  operationId: string
  summary: string
  method: HttpMethods
  responses: {
    statusCode: number
    description: string
    schema: ResponseSchemaType
  }[]
  tags: string[]
}

/**
 * null 또는 undefined가 아닌 값인지 확인하는 타입 가드
 */
export const isNotNullish = <TValue>(value: TValue | null | undefined): value is TValue => {
  return value !== null && value !== undefined
}
