import { OpenAPIV3_1 } from "openapi-types"

export type Options = {
  path: string
  arrayMinLength?: number
  arrayMaxLength?: number
  static?: boolean
  includeCodes?: number[]
  baseDir?: string
  specialPath?: string
  handlerUrl: string
}

export type SchemaOutputType = string | number | boolean | null | undefined | Date

type NestedSchemaOutputType<T> =
  | {
      [K in keyof T]: T[K] extends object ? NestedSchemaOutputType<T[K]> : T[K]
    }
  | SchemaOutputType
  | {}

export type ParseSchemaType = NestedSchemaOutputType<string>

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

export const isNotNullish = <TValue>(value: TValue | null | undefined): value is TValue => {
  return value !== null && value !== undefined
}
