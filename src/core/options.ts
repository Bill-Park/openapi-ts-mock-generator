import { Options } from "./types"
import { defaultOptions } from "./config"

/**
 * 사용자 옵션을 기본 옵션과 병합하여 완전한 옵션 객체를 생성
 */
export const mergeOptions = (userOptions: Partial<Options>): Options => {
  return {
    ...defaultOptions,
    ...userOptions,
  }
}

/**
 * CLI에서 받은 원시 옵션을 내부 옵션 형태로 변환
 */
export const transformCliOptions = (rawOptions: any): Options => {
  return {
    path: rawOptions.path || defaultOptions.path,
    baseDir: rawOptions.baseDir || defaultOptions.baseDir,
    arrayMinLength: parseInt(rawOptions.arrayMinLength) || defaultOptions.arrayMinLength,
    arrayMaxLength: parseInt(rawOptions.arrayMaxLength) || defaultOptions.arrayMaxLength,
    isStatic: rawOptions.static || defaultOptions.isStatic,
    handlerUrl: rawOptions.handlerUrl || defaultOptions.handlerUrl,
    fakerLocale: rawOptions.locales || defaultOptions.fakerLocale,
    generateTarget: rawOptions.generateTarget || defaultOptions.generateTarget,
    specialPath: rawOptions.specialPath || defaultOptions.specialPath,
    clear: rawOptions.clear || defaultOptions.clear,
    isOptional: rawOptions.isOptional || defaultOptions.isOptional,
    isSingleLine: rawOptions.isSingleLine || defaultOptions.isSingleLine,
    includeCodes: rawOptions.includeCodes
      ? rawOptions.includeCodes
          .toString()
          .split(",")
          .map((code: string) => parseInt(code))
      : undefined,
  }
}

/**
 * 옵션 유효성 검증
 */
export const validateOptions = (options: Options): string[] => {
  const errors: string[] = []

  if (!options.path) {
    errors.push("path is required")
  }

  if (
    options.arrayMinLength &&
    options.arrayMaxLength &&
    options.arrayMinLength > options.arrayMaxLength
  ) {
    errors.push("arrayMinLength should not be greater than arrayMaxLength")
  }

  if (
    options.generateTarget &&
    !options.generateTarget.split(",").every((target) => ["api", "schema"].includes(target.trim()))
  ) {
    errors.push("generateTarget should contain only 'api' and/or 'schema'")
  }

  return errors
}
