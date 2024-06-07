# openapi-ts-mock-generator

This project inpired from [msw-auto-mock](https://github.com/zoubingwu/msw-auto-mock)

- **Generate mock data from openapi.json**: schema and paths with responses.
- **Custom mock data**: use special fakers.

## Usage

- openapi.json with url

```bash
npx openapi-ts-mock-generator http://127.0.0.1/openapi.json
```

- openapi.json with file

```bash
npx openapi-ts-mock-generator openapi.json
```

## Options

- **-b, --base-dir**: base directory for input and output files.
- **-c, --include-codes**: include status codes in response.
- **-m, --array-min-length**: minimum length of array.
- **-M, --array-max-length**: maximum length of array.
- **-sp, --special-path**: special path for custom mock data.

## Special Keys

Special Keys are used for custom mock data.
Applied based on title and description.
Key is target title or description, value can be value type or faker type.

### value type

use value as mock data.

```json
{
  "year": {
    "value": "2024"
  }
}
```

### faker type

generate faker data.

```json
{
  "age": {
    "module": "number",
    "type": "int",
    "options": {
      "min": 0,
      "max": 150
    }
  }
}
```

## Formatter

When apply prettier format before writeFile, I got ERR_INVALID_ARG_VALUE error.

Please run formatter like prettier after generate file.
