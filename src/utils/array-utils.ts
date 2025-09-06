/**
 * 배열 처리 관련 유틸리티 함수들
 */

import { faker } from "../core"

/**
 * 지정된 범위 내에서 랜덤한 길이의 배열을 생성
 * 배열의 각 요소는 인덱스 값으로 초기화됨
 */
export const getRandomLengthArray = (min: number = 1, max: number = 3): number[] => {
  const length = faker.number.int({ min, max })
  return Array.from({ length }, (_, i) => i)
}

/**
 * 배열을 지정된 크기로 청크 단위로 분할
 */
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * 배열에서 중복 제거 (primitive 타입용)
 */
export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)]
}

/**
 * 배열에서 중복 제거 (객체용, 키 기준)
 */
export const uniqueBy = <T>(array: T[], keyFn: (item: T) => any): T[] => {
  const seen = new Set()
  return array.filter((item) => {
    const key = keyFn(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
