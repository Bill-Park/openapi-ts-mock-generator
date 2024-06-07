import { Options, ParseSchemaType, SchemaOutputType } from "./types"
import SwaggerParser from "@apidevtools/swagger-parser"
import { Faker, ko } from "@faker-js/faker"
import { isReference } from "oazapfts/generate"
import { OpenAPIV3_1 } from "openapi-types"

const faker = new Faker({
  locale: [ko],
})
faker.seed(1)

const defaultOptions: Options = {
  path: "",
  output: "",
  arrayMinLength: 1,
  arrayMaxLength: 3,
  static: true,
}

const ARRAY_MIN_LENGTH = 1
const ARRAY_MAX_LENGTH = 3

const MIN_STRING_LENGTH = 3
const MAX_STRING_LENGTH = 20

const MIN_INTEGER = 1
const MAX_INTEGER = 100000

const MIN_NUMBER = 0
const MAX_NUMBER = 100

const getRandomLengthArray = (min: number = ARRAY_MIN_LENGTH, max: number = ARRAY_MAX_LENGTH) => {
  const length = Math.floor(Math.random() * (max - min + 1)) + min
  return Array.from({ length }, (_, i) => i)
}

export const generate = async (options: Options = defaultOptions) => {
  if (!options.path) {
    console.warn("No path provided")
    return
  }
  const doc = await getOpenAPIDocs(options.path)

  const sampleSchemas = doc?.components?.schemas
  if (sampleSchemas === undefined) {
    console.warn("No schemas found")
    return
  }

  return Object.entries(sampleSchemas).reduce(
    (acc, [schemaName, schema]) => {
      const rootSchema = {} as Record<string, SchemaOutputType>
      acc[schemaName] = parseSchema(schema, rootSchema) as SchemaOutputType
      return acc
    },
    {} as Record<string, SchemaOutputType>
  )
}

const getOpenAPIDocs = async (path: string) => {
  const doc = await SwaggerParser.dereference(path)
  const isOpenApiV3 = "openapi" in doc && doc.openapi.startsWith("3")
  if (isOpenApiV3) return doc as OpenAPIV3_1.Document
  return
}

const parseSchema = (
  schemaValue: OpenAPIV3_1.ReferenceObject | OpenAPIV3_1.SchemaObject,
  outputSchema: ParseSchemaType
): ParseSchemaType => {
  if (isReference(schemaValue)) {
    console.warn("can't parse reference schema", schemaValue, schemaValue.$ref)
    return
  }

  if (schemaValue.type === "object") {
    if (schemaValue.properties === undefined) return undefined
    return Object.entries(schemaValue.properties).reduce(
      (acc, [key, field]) => {
        acc[key] = parseSchema(field, outputSchema) as SchemaOutputType
        return acc
      },
      {} as Record<string, SchemaOutputType>
    )
  } else if (schemaValue.enum !== undefined) {
    // enum value
    const enumValue = faker.helpers.arrayElement(schemaValue.enum)
    return enumValue
  } else if (schemaValue.allOf !== undefined) {
    // allOf value, sub model
    const allOfValue = schemaValue.allOf
    return faker.helpers.arrayElement(
      allOfValue.map((field) => {
        return parseSchema(field, outputSchema)
      })
    )
  } else if (schemaValue.anyOf !== undefined) {
    // anyOf value, select one or more. ex) string or null
    const anyOfValue = schemaValue.anyOf
    return faker.helpers.arrayElement(
      anyOfValue.map((field) => {
        return parseSchema(field, outputSchema)
      })
    )
  } else if (schemaValue.oneOf !== undefined) {
    // oneOf value, exactly one. Can't find example
    const oneOfValue = schemaValue.oneOf
    return faker.helpers.arrayElement(
      oneOfValue.map((field) => {
        return parseSchema(field, outputSchema)
      })
    )
  } else if (schemaValue.type === "array") {
    // array
    const arrayValue = schemaValue.items
    return getRandomLengthArray().map(() => parseSchema(arrayValue, outputSchema)) as (
      | SchemaOutputType
      | Record<string, SchemaOutputType>
    )[]
  } else if (schemaValue.type === "string" && schemaValue.format === "date-time") {
    // date-time, 2017-07-21T17:32:28Z
    return valueGenerator(schemaValue)
  } else if (schemaValue.type === "string" && schemaValue.format === "date") {
    // date, 2017-07-21
    return valueGenerator(schemaValue)
  } else if (schemaValue.type === "string" && schemaValue.title?.toLowerCase() === "b64uuid") {
    //b64uuid
    return valueGenerator(schemaValue)
  } else if (schemaValue.type === "string" && schemaValue.maxLength) {
    // string has max length
    return valueGenerator(schemaValue)
  } else if (schemaValue.type === "string" && schemaValue.minLength) {
    // string has min length
    return valueGenerator(schemaValue)
  } else if (schemaValue.type === "string" && schemaValue.pattern) {
    // regex pattern string
    return "pattern string"
  } else if (schemaValue.type === "string") {
    return valueGenerator(schemaValue)
  } else if (schemaValue.type === "integer") {
    // integer value.
    return valueGenerator(schemaValue)
  } else if (schemaValue.type === "number") {
    // numbers include decimal with min and max
    return valueGenerator(schemaValue)
  } else if (schemaValue.type === "boolean") {
    return true
  } else if (schemaValue.type === "null") {
    return null
  } else if (Object.keys(schemaValue).length === 0) {
    // array any. ex) blank=True list
    return "any"
  }
  return
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

const valueGenerator = (schemaValue: OpenAPIV3_1.SchemaObject): ParseSchemaType => {
  if (schemaValue.type === "string" && schemaValue.format === "date-time") {
    // date-time, 2017-07-21T17:32:28Z
    return faker.date
      .between({
        from: "2020-01-01T00:00:00.000Z",
        to: "2030-12-31T23:59:59.999Z",
      })
      .toISOString()
  } else if (schemaValue.type === "string" && schemaValue.format === "date") {
    // date, 2017-07-21
    return faker.date
      .between({
        from: "2020-01-01T00:00:00.000Z",
        to: "2030-12-31T23:59:59.999Z",
      })
      .toISOString()
      .split("T")[0]
  } else if (schemaValue.type === "string" && schemaValue.title?.toLowerCase() === "b64uuid") {
    // generate base 64 uuid
    const baseUuid = faker.string.uuid()
    return uuidToB64(baseUuid)
  } else if (schemaValue.type === "string" && schemaValue.minLength && schemaValue.maxLength) {
    // string has max length
    return faker.string.alphanumeric({
      length: { min: schemaValue.minLength, max: schemaValue.maxLength },
    })
  } else if (schemaValue.type === "string" && schemaValue.maxLength) {
    // string has max length
    const minStringLength = Math.min(MIN_STRING_LENGTH, schemaValue.maxLength)
    return faker.string.alphanumeric({
      length: { min: minStringLength, max: schemaValue.maxLength },
    })
  } else if (schemaValue.type === "string" && schemaValue.minLength) {
    // string has min length
    const maxStringLength = Math.max(MAX_STRING_LENGTH, schemaValue.minLength)
    return faker.string.alphanumeric({
      length: { min: schemaValue.minLength, max: maxStringLength },
    })
  } else if (schemaValue.type === "string") {
    return faker.string.alphanumeric({
      length: { min: MIN_STRING_LENGTH, max: MAX_STRING_LENGTH },
    })
  } else if (schemaValue.type === "integer") {
    return faker.number.int({ min: MIN_INTEGER, max: MAX_INTEGER })
  } else if (schemaValue.type === "number" && schemaValue.maximum && schemaValue.minimum) {
    return faker.number.float({
      min: schemaValue.minimum,
      max: schemaValue.maximum,
      fractionDigits: 2,
    })
  } else if (schemaValue.type === "number" && schemaValue.maximum) {
    return faker.number.float({
      min: MIN_NUMBER,
      max: schemaValue.maximum,
      fractionDigits: 2,
    })
  } else if (schemaValue.type === "number" && schemaValue.minimum) {
    return faker.number.float({
      min: schemaValue.minimum,
      max: MAX_NUMBER,
      fractionDigits: 2,
    })
  } else if (schemaValue.type === "number") {
    return faker.number.float({
      min: MIN_NUMBER,
      max: MAX_NUMBER,
      fractionDigits: 2,
    })
  } else if (schemaValue.type === "boolean") {
    return faker.datatype.boolean()
  } else if (schemaValue.type === "null") {
    return null
  }
  return faker.word.adjective()
}
