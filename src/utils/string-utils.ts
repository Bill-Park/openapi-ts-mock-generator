/**
 * 문자열 처리 관련 유틸리티 함수들
 */

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
