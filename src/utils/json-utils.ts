/**
 * JSON 변환 관련 유틸리티 함수들
 */

import { ParseSchemaType, CodeFormatOptions } from "../core"

/**
 * 객체를 따옴표 없는 JSON 문자열로 변환
 * TypeScript 코드 생성에 사용되며, 동적 faker 호출을 그대로 유지
 */
export const toUnquotedJSON = (param: ParseSchemaType, options: CodeFormatOptions = {}): string => {
  const { depth = 0, isStatic = false, singleLine = false } = options

  const prefixSpace = " ".repeat(depth * 2) // 들여쓰기용
  const lineBreak = singleLine ? "" : "\n"

  if (param === null) {
    return "null"
  }

  if (Array.isArray(param)) {
    const results = param.map((elem) => toUnquotedJSON(elem, { ...options, depth: depth + 1 }))
    const firstElementSpace = singleLine ? "" : "  "
    return ["[", firstElementSpace + results.join(", "), "]"].join(lineBreak + prefixSpace)
  }

  if (typeof param === "object") {
    const firstElementSpace = singleLine ? " " : "  "
    const lastComma = singleLine ? ", " : ","

    const results = Object.entries(param)
      .map(([key, value]) => {
        return `${firstElementSpace}${key}: ${toUnquotedJSON(value, {
          ...options,
          depth: depth + 1,
        })}${lastComma}`
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
 * 객체를 예쁘게 포맷된 JSON 문자열로 변환
 */
export const prettyStringify = (obj: any, indent: number = 2): string => {
  return JSON.stringify(obj, null, indent)
}
