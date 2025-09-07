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
  const { depth = 0, isStatic, isSingleLine } = options

  const prefixSpace = " ".repeat(depth * 2) // 들여쓰기용
  const lineBreak = isSingleLine ? "" : "\n"

  if (param === null) {
    return "null"
  }

  if (Array.isArray(param)) {
    const results = param
      .map((elem) => toTypeScriptCode(elem, { ...options, depth: depth + 1 }))
      .join("," + lineBreak + prefixSpace)
    return ["[", results, "]"].join(lineBreak + prefixSpace)
  }

  if (typeof param === "object") {
    const lastComma = isSingleLine ? ", " : ","

    const results = Object.entries(param)
      .map(([key, value]) => {
        return generateObjectProperty(key, value, options, prefixSpace, lineBreak, lastComma)
      })
      .join(lineBreak + prefixSpace)

    return ["{", `${results}`, "}"].join(lineBreak + prefixSpace)
  }

  // 문자열 처리
  if (typeof param === "string") {
    // 동적 faker 호출은 그대로 유지
    if (
      isStatic === false &&
      (param.startsWith("faker") || param.startsWith("Buffer.from(faker"))
    ) {
      return param
    }

    // " as const" 분리하여 처리
    if (param.endsWith(" as const")) {
      return `"${param.slice(0, -" as const".length)}" as const`
    }
  }

  return JSON.stringify(param)
}

/**
 * nullable 타입 확장 여부 확인
 */
const shouldApplyNullableExtension = (value: any, isOptional: boolean): boolean => {
  if (!isOptional) return false

  // 값이 null인 경우
  if (value === null) return true

  // 문자열 및 null을 포함한 경우
  if (typeof value === "string" && value.includes(",null")) {
    return true
  }

  return false
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
  const { isOptional, depth = 0 } = options

  // nullable 타입 확장 로직
  const shouldApplyNullable = shouldApplyNullableExtension(value, isOptional)
  const nullableTypeExtensionStart = shouldApplyNullable
    ? `...(faker.datatype.boolean() ? {${lineBreak}${prefixSpace}`
    : ""
  const nullableTypeExtensionEnd = shouldApplyNullable ? `${lineBreak}${prefixSpace}} : {})` : ""

  const propertyValue = toTypeScriptCode(value, {
    ...options,
    depth: depth + 1,
  })

  return `${nullableTypeExtensionStart}${prefixSpace}${key}: ${propertyValue}${nullableTypeExtensionEnd}${lastComma}`
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
