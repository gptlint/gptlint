import { fileTypeFromFile } from 'file-type'

const textFileMimeTypePrefixes = [
  'text/',
  'application/json',
  'application/xml',
  'application/javascript'
]

export async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    const fileType = await fileTypeFromFile(filePath)

    if (!fileType) {
      // Unknown file type; assume it's a text file
      return false
    }

    for (const mimeTypePrefix of textFileMimeTypePrefixes) {
      if (fileType.mime.startsWith(mimeTypePrefix)) {
        // The file is a known text file
        return false
      }
    }

    // Binary file type
    return true
  } catch (err: any) {
    throw new Error(`Error reading file: ${filePath}: ${err.message}`, {
      cause: err
    })
  }
}
