import { Options } from "./types"

export const defaultOptions: Options = {
  path: "",
  output: "",
  arrayMinLength: 1,
  arrayMaxLength: 3,
  static: true,
}

export const ARRAY_MIN_LENGTH = 1
export const ARRAY_MAX_LENGTH = 3

export const MIN_STRING_LENGTH = 3
export const MAX_STRING_LENGTH = 20

export const MIN_INTEGER = 1
export const MAX_INTEGER = 100000

export const MIN_NUMBER = 0
export const MAX_NUMBER = 100

export const MIN_WORD_LENGTH = 0
export const MAX_WORD_LENGTH = 3

export const FAKER_SEED = 1
