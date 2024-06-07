export type Options = {
  path: string
  output: string
  arrayMinLength?: number
  arrayMaxLength?: number
  static?: boolean
}

export type SchemaOutputType = string | number | boolean | null | undefined | Date

export type ParseSchemaType =
  | SchemaOutputType
  | Record<string, SchemaOutputType>
  | (SchemaOutputType | Record<string, SchemaOutputType>)[]
