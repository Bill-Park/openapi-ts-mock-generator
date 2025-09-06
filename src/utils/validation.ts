/**
 * 검증 관련 유틸리티 함수들
 */

/**
 * 값이 null이나 undefined가 아닌지 확인하는 타입 가드
 * core/types.ts의 isNotNullish와 동일하지만 utils에서 독립적으로 사용
 */
export const isNotEmpty = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined
}

/**
 * 문자열이 비어있지 않은지 확인
 */
export const isNonEmptyString = (value: any): value is string => {
  return typeof value === "string" && value.trim().length > 0
}

/**
 * 숫자가 유효한 범위 내에 있는지 확인
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max
}

/**
 * 배열이 비어있지 않은지 확인
 */
export const isNonEmptyArray = <T>(value: any): value is T[] => {
  return Array.isArray(value) && value.length > 0
}

/**
 * 객체가 비어있지 않은지 확인
 */
export const isNonEmptyObject = (value: any): value is Record<string, any> => {
  return typeof value === "object" && value !== null && Object.keys(value).length > 0
}

/**
 * HTTP 상태 코드가 유효한지 확인
 */
export const isValidStatusCode = (code: number): boolean => {
  return isInRange(code, 100, 599)
}

/**
 * 파일 확장자가 허용된 목록에 있는지 확인
 */
export const hasValidExtension = (filename: string, allowedExtensions: string[]): boolean => {
  const extension = filename.split(".").pop()?.toLowerCase()
  return extension ? allowedExtensions.includes(extension) : false
}

/**
 * URL 형식이 올바른지 간단히 확인
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}
