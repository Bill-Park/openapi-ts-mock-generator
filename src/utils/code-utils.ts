/**
 * 코드 생성 관련 유틸리티 함수들
 */

import { ParseSchemaType, TypeScriptCodeOptions, CodeFormatOptions } from "../core"

/**
 * 객체를 TypeScript 코드로 변환 (nullable 타입 확장 지원)
 * 동적 모킹에서 optional 필드를 지원하는 코드를 생성
 */
export const toTypeScriptCode = (
  param: ParseSchemaType,
  options: TypeScriptCodeOptions
): string => {
  const { depth = 0, isStatic, isSingleLine, isOptional } = options

  const prefixSpace = " ".repeat(depth * 2) // 들여쓰기용
  const lineBreak = isSingleLine ? "" : "\n"

  if (param === null) {
    return "null"
  }

  if (Array.isArray(param)) {
    const results = param.map((elem) => toTypeScriptCode(elem, { ...options, depth: depth + 1 }))
    const firstElementSpace = isSingleLine ? "" : "  "
    return ["[", firstElementSpace + results.join(", "), "]"].join(lineBreak + prefixSpace)
  }

  if (typeof param === "object") {
    const firstElementSpace = isSingleLine ? " " : "  "
    const lastComma = isSingleLine ? ", " : ","

    const results = Object.entries(param)
      .map(([key, value]) => {
        return generateObjectProperty(key, value, options, prefixSpace, lineBreak, lastComma)
      })
      .join(lineBreak + prefixSpace)

    return ["{", `${results}`, "}"].join(lineBreak + prefixSpace)
  }

  if (
    typeof param === "string" &&
    isStatic === false &&
    (param.startsWith("faker") || param.startsWith("Buffer.from(faker"))
  ) {
    return param // 동적 모드에서 faker 호출은 그대로 유지
  }

  if (typeof param === "string" && param.endsWith(" as const")) {
    // " as const" 분리하여 처리
    return `"${param.slice(0, -" as const".length)}" as const`
  }

  return JSON.stringify(param)
}

/**
 * 객체 프로퍼티를 생성 (nullable 타입 확장 포함)
 */
const generateObjectProperty = (
  key: string,
  value: any,
  options: TypeScriptCodeOptions,
  prefixSpace: string,
  lineBreak: string,
  lastComma: string
): string => {
  const { isOptional, depth } = options
  const firstElementSpace = options.isSingleLine ? " " : "  "

  // nullable 타입 확장 로직
  const hasNull = optional && typeof value === "string" && value.includes(",null")
  const nullableTypeExtensionStart = hasNull ? "...(faker.datatype.boolean() ? {" : ""
  const nullableTypeExtensionEnd = hasNull ? "} : {})" : ""

  const propertyValue = toTypeScriptCode(value, {
    ...options,
    depth: depth + 1,
  })

  return `${firstElementSpace}${nullableTypeExtensionStart}${key}: ${propertyValue}${nullableTypeExtensionEnd}${lastComma}`
}

/**
 * 순수한 JSON 변환 (코드 생성 로직 없음)
 */
export const toCleanJSON = (param: ParseSchemaType, options: CodeFormatOptions = {}): string => {
  const { depth = 0, singleLine = false } = options

  const prefixSpace = " ".repeat(depth * 2)
  const lineBreak = singleLine ? "" : "\n"

  if (param === null) {
    return "null"
  }

  if (Array.isArray(param)) {
    const results = param.map((elem) => toCleanJSON(elem, { ...options, depth: depth + 1 }))
    const firstElementSpace = singleLine ? "" : "  "
    return ["[", firstElementSpace + results.join(", "), "]"].join(lineBreak + prefixSpace)
  }

  if (typeof param === "object") {
    const firstElementSpace = singleLine ? " " : "  "
    const lastComma = singleLine ? ", " : ","

    const results = Object.entries(param)
      .map(([key, value]) => {
        return `${firstElementSpace}${key}: ${toCleanJSON(value, {
          ...options,
          depth: depth + 1,
        })}${lastComma}`
      })
      .join(lineBreak + prefixSpace)

    return ["{", `${results}`, "}"].join(lineBreak + prefixSpace)
  }

  return JSON.stringify(param)
}

/**
 * 멀티라인 코드를 한 줄로 압축
 */
export const compressCode = (code: string): string => {
  return code
    .replace(/\n/g, " ") // 줄바꿈을 공백으로
    .replace(/\s+/g, " ") // 연속된 공백을 하나로
    .replace(/\s\./g, ".") // 공백 + 점을 점으로
    .trim()
}

/**
 * TypeScript 인터페이스 코드 생성
 */
export const generateInterface = (name: string, properties: Record<string, string>): string => {
  const props = Object.entries(properties)
    .map(([key, type]) => `  ${key}: ${type}`)
    .join("\n")

  return `interface ${name} {\n${props}\n}`
}

/**
 * TypeScript 타입 별칭 코드 생성
 */
export const generateTypeAlias = (name: string, type: string): string => {
  return `type ${name} = ${type}`
}
