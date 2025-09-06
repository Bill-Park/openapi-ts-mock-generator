/**
 * Faker 설정 파일 생성 로직
 * 동적 모킹에 사용할 Faker 설정 파일을 생성
 */

import { Options } from "../core"
import { ensureDir, safeWriteFile } from "../utils"
import * as path from "path"

/**
 * Faker 설정 파일을 생성
 * 사용자가 지정한 로케일로 Faker 인스턴스를 설정하는 파일을 생성
 */
export const generateFaker = (options: Options): void => {
  const directory = path.join(options.baseDir ?? "")
  ensureDir(directory)

  const content = generateFakerFileContent(options)
  const outputFileName = path.join(options.baseDir ?? "", "fakers.ts")
  safeWriteFile(outputFileName, content)
  console.log(`Generated fakers ${outputFileName}`)
}

/**
 * Faker 파일의 내용 생성
 */
const generateFakerFileContent = (options: Options): string => {
  const { GEN_COMMENT } = require("../core")

  const localeOption = options.fakerLocale.replace(",", ", ")
  const importFaker = `import { Faker, ${localeOption} } from "@faker-js/faker"\n\n`
  const fakerDeclare = [
    "export const faker = new Faker({",
    `  locale: [${localeOption}]`,
    "})",
  ].join("\n")

  return GEN_COMMENT + importFaker + fakerDeclare
}

/**
 * 스키마 모킹 파일을 생성
 * 스키마별 모킹 데이터를 담은 파일을 생성
 */
export const generateSchemaFile = (schemas: Record<string, any>, options: Options): void => {
  const { toUnquotedJSON } = require("../utils")
  const { GEN_COMMENT } = require("../core")

  // key is schema name, value is generated schema value
  const generatedVars = Object.entries(schemas)
    .map(([varName, varValue]) => {
      return `export const ${varName}Mock = ${toUnquotedJSON(varValue, {
        isStatic: options.isStatic,
      })}`
    })
    .join("\n\n")

  const importFaker = options.isStatic ? "" : 'import { faker } from "./fakers"\n\n'
  const content = GEN_COMMENT + importFaker + generatedVars

  const outputFileName = path.join(options.baseDir ?? "", "schemas.ts")
  safeWriteFile(outputFileName, content)
  console.log(`Generated schema ${outputFileName}`)
}

/**
 * 사용자 정의 Faker 설정 파일 생성
 * 특별한 Faker 규칙을 담은 설정 파일들을 생성
 */
export const generateCustomFakerConfig = (
  titleConfig: Record<string, any>,
  descriptionConfig: Record<string, any>,
  options: Options
): void => {
  if (!options.specialPath) return

  const specialDir = path.join(options.baseDir ?? "", options.specialPath)
  ensureDir(specialDir)

  // titles.json 생성
  const titlesPath = path.join(specialDir, "titles.json")
  safeWriteFile(titlesPath, JSON.stringify(titleConfig, null, 2))
  console.log(`Generated custom faker titles config: ${titlesPath}`)

  // descriptions.json 생성
  const descriptionsPath = path.join(specialDir, "descriptions.json")
  safeWriteFile(descriptionsPath, JSON.stringify(descriptionConfig, null, 2))
  console.log(`Generated custom faker descriptions config: ${descriptionsPath}`)
}

/**
 * Faker 설정의 유효성 검증
 */
export const validateFakerConfig = (
  config: Record<string, any>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  Object.entries(config).forEach(([key, value]) => {
    if (typeof value !== "object") {
      errors.push(`Config for "${key}" must be an object`)
      return
    }

    if ("module" in value && "type" in value) {
      if (typeof value.module !== "string") {
        errors.push(`Module for "${key}" must be a string`)
      }
      if (typeof value.type !== "string") {
        errors.push(`Type for "${key}" must be a string`)
      }
    } else if (!("value" in value)) {
      errors.push(`Config for "${key}" must have either "value" or "module"+"type"`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 기본 Faker 설정 템플릿 생성
 */
export const generateDefaultFakerTemplate = (): {
  titles: Record<string, any>
  descriptions: Record<string, any>
} => {
  return {
    titles: {
      "User ID": {
        module: "string",
        type: "uuid",
      },
      Email: {
        module: "internet",
        type: "email",
      },
      Name: {
        module: "person",
        type: "fullName",
      },
    },
    descriptions: {
      "사용자 이메일": {
        module: "internet",
        type: "email",
      },
      "사용자 이름": {
        module: "person",
        type: "fullName",
        options: { locale: "ko" },
      },
      전화번호: {
        module: "phone",
        type: "number",
      },
    },
  }
}

/**
 * 로케일별 사용 가능한 Faker 모듈 정보 반환
 */
export const getLocaleSpecificModules = (locale: string): string[] => {
  const commonModules = [
    "datatype",
    "date",
    "finance",
    "git",
    "hacker",
    "helpers",
    "image",
    "internet",
    "lorem",
    "music",
    "person",
    "phone",
    "random",
    "system",
    "vehicle",
  ]

  // 로케일별 특별한 모듈이 있다면 여기에 추가
  const localeModules: Record<string, string[]> = {
    ko: ["person", "phone", "address"],
    en: ["person", "phone", "address", "company"],
    ja: ["person", "phone", "address"],
  }

  return [...commonModules, ...(localeModules[locale] || [])]
}
