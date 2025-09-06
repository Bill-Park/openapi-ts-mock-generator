/**
 * 문자열 처리 관련 유틸리티 함수들
 */

/**
 * 멀티라인 문자열을 한 줄로 압축하고 정리
 * - 줄바꿈을 공백으로 변환
 * - 연속된 공백을 하나로 압축
 * - 공백 + 점을 점으로 변환
 */
export const multiLineStr = (str: string): string => {
  return str
    .replace(/\n/g, " ") // 줄바꿈을 공백으로
    .replace(/\s+/g, " ") // 연속된 공백을 하나로
    .replace(/\s\./g, ".") // 공백 + 점을 점으로
    .trim()
}

/**
 * UUID를 Base64 형태로 변환
 * URL-safe Base64 인코딩을 사용하여 패딩 제거
 */
export const uuidToB64 = (uuid: string): string => {
  const uuidBuffer = Buffer.from(uuid.replace(/-/g, ""), "hex")
  const base64Uuid = uuidBuffer
    .toString("base64")
    .replace(/\+/g, "-") // + 를 - 로
    .replace(/\//g, "_") // / 를 _ 로
    .replace(/=/g, "") // 패딩 제거
  return base64Uuid
}

/**
 * camelCase 문자열을 kebab-case로 변환
 */
export const camelToKebab = (str: string): string => {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()
}

/**
 * 문자열이 URL인지 확인
 */
export const isUrl = (str: string): boolean => {
  return str.startsWith("http://") || str.startsWith("https://")
}

/**
 * 파일 확장자 추출
 */
export const getFileExtension = (filename: string): string => {
  return filename.split(".").pop() || ""
}
