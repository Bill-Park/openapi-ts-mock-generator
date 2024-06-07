import {
  ARRAY_MAX_LENGTH,
  ARRAY_MIN_LENGTH,
  MAX_INTEGER,
  MAX_NUMBER,
  MAX_STRING_LENGTH,
  MAX_WORD_LENGTH,
  MIN_INTEGER,
  MIN_NUMBER,
  MIN_STRING_LENGTH,
  MIN_WORD_LENGTH,
  faker,
} from "./defaults"
import { Options, ParseSchemaType, SchemaOutputType } from "./types"
import { multiLineStr, toUnquotedJSON } from "./writer"
import SwaggerParser from "@apidevtools/swagger-parser"
import { pascalCase } from "change-case-all"
import { existsSync, readFileSync } from "fs"
import { isReference } from "oazapfts/generate"
import { OpenAPIV3_1 } from "openapi-types"
import { join } from "path"

export const parseSchema = (
  schemaValue: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
  specialSchema: ReturnType<typeof specialFakerParser>,
  isStatic: boolean,
  outputSchema: ParseSchemaType = {}
): ParseSchemaType => {
  if (isReference(schemaValue)) {
    console.warn("can't parse reference schema", schemaValue, schemaValue.$ref)
    return
  }

  if (schemaValue.type === "object") {
    if (schemaValue.properties === undefined) return {}
    return Object.entries(schemaValue.properties).reduce(
      (acc, [key, field]) => {
        acc[key] = parseSchema(field, specialSchema, isStatic, outputSchema) as SchemaOutputType
        return acc
      },
      {} as Record<string, SchemaOutputType>
    )
  } else if (schemaValue.enum !== undefined) {
    // enum value
    const enumValue = isStatic
      ? faker.helpers.arrayElement(schemaValue.enum)
      : `faker.helpers.arrayElement(${toUnquotedJSON(schemaValue.enum, {
          depth: 0,
          isStatic,
          singleLine: true,
        })})`
    if (isStatic && typeof enumValue === "string") return enumValue + " as const"
    return enumValue
  } else if (schemaValue.allOf !== undefined) {
    // allOf value, sub model
    const allOfValue = schemaValue.allOf
    return faker.helpers.arrayElement(
      allOfValue.map((field) => {
        return parseSchema(field, specialSchema, isStatic, outputSchema)
      })
    )
  } else if (schemaValue.anyOf !== undefined) {
    // anyOf value, select one or more. ex) string or null
    const anyOfValue = schemaValue.anyOf
    return faker.helpers.arrayElement(
      anyOfValue.map((field) => {
        return parseSchema(field, specialSchema, isStatic, outputSchema)
      })
    )
  } else if (schemaValue.oneOf !== undefined) {
    // oneOf value, exactly one. Can't find example
    const oneOfValue = schemaValue.oneOf
    return faker.helpers.arrayElement(
      oneOfValue.map((field) => {
        return parseSchema(field, specialSchema, isStatic, outputSchema)
      })
    )
  } else if (schemaValue.type === "array") {
    // array
    const arrayValue = schemaValue.items
    return getRandomLengthArray().map(() =>
      parseSchema(arrayValue, specialSchema, isStatic, outputSchema)
    ) as (SchemaOutputType | Record<string, SchemaOutputType>)[]
  }
  return valueGenerator(schemaValue, specialSchema, isStatic)
}

const uuidToB64 = (uuid: string) => {
  const uuidBuffer = Buffer.from(uuid.replace(/-/g, ""), "hex")
  const base64Uuid = uuidBuffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  return base64Uuid
}

const valueGenerator = (
  schemaValue: OpenAPIV3_1.SchemaObject,
  specialSchema: ReturnType<typeof specialFakerParser>,
  isStatic: boolean
): ParseSchemaType => {
  // if title or description in special keys
  // return special faker data
  const { titleSpecial, descriptionSpecial } = specialSchema
  if (schemaValue.title && titleSpecial[schemaValue.title]) {
    return titleSpecial[schemaValue.title]
  } else if (schemaValue.description && descriptionSpecial[schemaValue.description]) {
    return descriptionSpecial[schemaValue.description]
  }

  if (schemaValue.type === "string" && schemaValue.format === "date-time") {
    // date-time, 2017-07-21T17:32:28Z
    return isStatic
      ? faker.date
          .between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-12-31T23:59:59.999Z",
          })
          .toISOString()
      : multiLineStr(`
          faker.date.between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-12-31T23:59:59.999Z",
          })
          .toISOString()
          `)
  } else if (schemaValue.type === "string" && schemaValue.format === "date") {
    // date, 2017-07-21
    return isStatic
      ? faker.date
          .between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-12-31T23:59:59.999Z",
          })
          .toISOString()
          .split("T")[0]
      : multiLineStr(`
          faker.date.between({
            from: "2020-01-01T00:00:00.000Z",
            to: "2030-12-31T23:59:59.999Z",
          })
          .toISOString()
          .split("T")[0]
        `)
  } else if (schemaValue.type === "string" && schemaValue.pattern) {
    return isStatic
      ? faker.helpers.fromRegExp(schemaValue.pattern)
      : `faker.helpers.fromRegExp(/${schemaValue.pattern}/)`
  } else if (schemaValue.type === "string" && schemaValue.title?.toLowerCase() === "b64uuid") {
    // generate base 64 uuid
    const baseUuid = faker.string.uuid()
    return isStatic
      ? uuidToB64(baseUuid)
      : multiLineStr(`
          Buffer.from(faker.string.uuid().replace(/-/g, ""), "hex")
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\\//g, "_")
          .replace(/=/g, "")
        `)
  } else if (schemaValue.type === "string") {
    const minLength =
      schemaValue.minLength ??
      Math.min(MIN_STRING_LENGTH, schemaValue.maxLength ?? MAX_STRING_LENGTH)
    const maxLength =
      schemaValue.maxLength ??
      Math.max(MAX_STRING_LENGTH, schemaValue.minLength ?? MIN_STRING_LENGTH)

    return isStatic
      ? faker.string.alphanumeric({
          length: { min: minLength, max: maxLength },
        })
      : multiLineStr(`
          faker.string.alphanumeric({
            length: { min: ${minLength}, max: ${maxLength} },
          })
        `)
  } else if (schemaValue.type === "integer") {
    return isStatic
      ? faker.number.int({ min: MIN_INTEGER, max: MAX_INTEGER })
      : multiLineStr(`
          faker.number.int({ min: ${MIN_INTEGER}, max: ${MAX_INTEGER} })
        `)
  } else if (schemaValue.type === "number") {
    const minNumber = schemaValue.minimum ?? Math.min(MIN_NUMBER, schemaValue.maximum ?? MAX_NUMBER)
    const maxNumber = schemaValue.maximum ?? Math.max(MAX_NUMBER, schemaValue.minimum ?? MIN_NUMBER)
    return isStatic
      ? faker.number.float({
          min: minNumber,
          max: maxNumber,
          fractionDigits: 2,
        })
      : multiLineStr(`
          faker.number.float({
            min: ${minNumber},
            max: ${maxNumber},
            fractionDigits: 2,
          })
        `)
  } else if (schemaValue.type === "boolean") {
    return isStatic ? faker.datatype.boolean() : "faker.datatype.boolean()"
  } else if (schemaValue.type === "null") {
    return null
  } else if (Object.keys(schemaValue).length === 0) {
    // array any. ex) blank=True list
    return isStatic
      ? faker.word.words({
          count: {
            min: MIN_WORD_LENGTH,
            max: MAX_WORD_LENGTH,
          },
        })
      : multiLineStr(`
          faker.word.words({
            count: {
              min: ${MIN_WORD_LENGTH},
              max: ${MAX_WORD_LENGTH},
            },
          })
        `)
  }

  return isStatic ? faker.word.adjective() : "faker.word.adjective()"
}

export const getRandomLengthArray = (
  min: number = ARRAY_MIN_LENGTH,
  max: number = ARRAY_MAX_LENGTH
) => {
  const length = faker.number.int({
    min,
    max,
  })
  return Array.from({ length }, (_, i) => i)
}

export const refSchemaParser = (ref: string, refs: SwaggerParser.$Refs) => {
  const schemaName = pascalCase(ref.replace("#/components/schemas/", ""))
  const schemaValue: OpenAPIV3_1.SchemaObject = refs.get(ref)
  return { name: schemaName, value: schemaValue }
}

const getFakerValue = (value: object): SchemaOutputType => {
  if ("value" in value) {
    // value type, use directly
    return value.value as SchemaOutputType
  } else if ("module" in value && "type" in value) {
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
}

export const specialFakerParser = (options: Options) => {
  if (options.specialPath === undefined)
    return {
      titleSpecial: {},
      descriptionSpecial: {},
    }
  const titlePath = join(options.baseDir ?? "", options.specialPath, "titles.json")
  const descPath = join(options.baseDir ?? "", options.specialPath, "descriptions.json")
  const titleSpecialKey: Record<string, object> = existsSync(titlePath)
    ? JSON.parse(readFileSync(titlePath, "utf-8"))
    : {}
  const descriptionSpecialKey: Record<string, object> = existsSync(descPath)
    ? JSON.parse(readFileSync(descPath, "utf-8"))
    : {}

  const titleSpecial = Object.entries(titleSpecialKey).reduce(
    (acc, [key, value]) => {
      const fakerValue = getFakerValue(value)
      acc[key] = fakerValue
      return acc
    },
    {} as Record<string, SchemaOutputType>
  )

  const descriptionSpecial = Object.entries(descriptionSpecialKey).reduce(
    (acc, [key, value]) => {
      const fakerValue = getFakerValue(value)
      acc[key] = fakerValue
      return acc
    },
    {} as Record<string, SchemaOutputType>
  )

  return { titleSpecial, descriptionSpecial }
}
