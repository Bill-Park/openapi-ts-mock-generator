/**
 * 파일 시스템 관련 유틸리티 함수들
 */

import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from "fs"
import * as path from "path"

/**
 * 디렉토리가 존재하지 않으면 생성
 */
export const ensureDir = (dirPath: string): void => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * 디렉토리를 비우고 정리
 */
export const clearDirectory = (dirPath: string): void => {
  if (existsSync(dirPath)) {
    readdirSync(dirPath).forEach((file) => {
      rmSync(path.join(dirPath, file))
    })
  }
}

/**
 * 안전하게 파일 쓰기 (디렉토리 자동 생성)
 */
export const safeWriteFile = (filePath: string, content: string): void => {
  const dir = path.dirname(filePath)
  ensureDir(dir)
  writeFileSync(filePath, content)
}

/**
 * JSON 파일 읽기 (파일이 없으면 기본값 반환)
 */
export const readJsonFile = <T>(filePath: string, defaultValue: T): T => {
  if (!existsSync(filePath)) {
    return defaultValue
  }

  try {
    const content = readFileSync(filePath, "utf-8")
    return JSON.parse(content)
  } catch (error) {
    console.warn(`Failed to read JSON file ${filePath}:`, error)
    return defaultValue
  }
}

/**
 * 파일 경로가 URL인지 로컬 파일인지 확인하여 절대 경로 반환
 */
export const resolveFilePath = (inputPath: string, baseDir?: string): string => {
  if (inputPath.startsWith("http")) {
    return inputPath
  }

  if (baseDir) {
    return path.join(baseDir, inputPath)
  }

  return inputPath
}

/**
 * 여러 파일명 조합하여 고유한 파일명 생성
 */
export const createUniqueFileName = (baseName: string, extension: string): string => {
  const timestamp = Date.now()
  return `${baseName}-${timestamp}.${extension}`
}
