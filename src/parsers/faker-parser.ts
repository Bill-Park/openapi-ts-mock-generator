/**
 * Faker 관련 파싱 및 특별한 데이터 생성 로직
 */

import { Options, SchemaOutputType, faker } from "../core"
import { toUnquotedJSON, readJsonFile } from "../utils"
import { join } from "path"

/**
 * 특별한 Faker 규칙을 파싱하여 적용
 * titles.json과 descriptions.json에서 사용자 정의 faker 규칙을 로드
 */
export const specialFakerParser = (options: Options) => {
  if (options.specialPath === undefined)
    return {
      titleSpecial: {},
      descriptionSpecial: {},
    }

  const titlePath = join(options.baseDir ?? "", options.specialPath, "titles.json")
  const descPath = join(options.baseDir ?? "", options.specialPath, "descriptions.json")
  const titleSpecialKey: Record<string, object> = readJsonFile(titlePath, {})
  const descriptionSpecialKey: Record<string, object> = readJsonFile(descPath, {})

  const titleSpecial = Object.entries(titleSpecialKey).reduce((acc, [key, value]) => {
    const fakerValue = getFakerValue(value, {
      isStatic: options.isStatic,
    })
    acc[key] = fakerValue
    return acc
  }, {} as Record<string, SchemaOutputType>)

  const descriptionSpecial = Object.entries(descriptionSpecialKey).reduce((acc, [key, value]) => {
    const fakerValue = getFakerValue(value, {
      isStatic: options.isStatic,
    })
    acc[key] = fakerValue
    return acc
  }, {} as Record<string, SchemaOutputType>)

  return { titleSpecial, descriptionSpecial }
}

/**
 * 특별한 Faker 값 정의에서 실제 값을 생성
 */
const getFakerValue = (value: object, options: { isStatic: boolean }): SchemaOutputType => {
  if ("value" in value) {
    // value type, use directly
    return value.value as SchemaOutputType
  }

  if ("module" in value && "type" in value) {
    // dynamic faker
    if (options.isStatic === false) {
      const fakerOption =
        "options" in value
          ? toUnquotedJSON(value.options, {
              depth: 0,
              isStatic: options.isStatic,
              singleLine: true,
            })
          : ""
      return `faker.${value.module}.${value.type}(${fakerOption})`
    }

    // faker type, make faker
    const fakerModule = faker[value.module as keyof typeof faker]
    if (fakerModule === undefined) {
      console.warn("can't find faker module", fakerModule)
      return undefined
    }

    const fakerFunc = fakerModule[value.type as keyof typeof fakerModule] as Function
    if (fakerFunc === undefined || typeof fakerFunc !== "function") {
      console.warn("can't find faker function", fakerFunc)
      return undefined
    }

    return "options" in value ? fakerFunc(value.options) : fakerFunc()
  }

  return undefined
}

/**
 * Faker 모듈의 유효성을 검증
 */
export const validateFakerModule = (moduleName: string): boolean => {
  return moduleName in faker
}

/**
 * Faker 함수의 유효성을 검증
 */
export const validateFakerFunction = (moduleName: string, functionName: string): boolean => {
  try {
    const fakerModule = faker[moduleName as keyof typeof faker]
    return typeof fakerModule?.[functionName as keyof typeof fakerModule] === "function"
  } catch {
    return false
  }
}

/**
 * 사용 가능한 Faker 모듈 목록 반환
 */
export const getAvailableFakerModules = (): string[] => {
  return Object.keys(faker).filter((key) => typeof faker[key as keyof typeof faker] === "object")
}

/**
 * 특정 Faker 모듈의 사용 가능한 함수 목록 반환
 */
export const getAvailableFakerFunctions = (moduleName: string): string[] => {
  try {
    const fakerModule = faker[moduleName as keyof typeof faker]
    if (!fakerModule) return []

    return Object.keys(fakerModule).filter(
      (key) => typeof fakerModule[key as keyof typeof fakerModule] === "function"
    )
  } catch {
    return []
  }
}
