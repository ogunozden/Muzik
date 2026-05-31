import {readFileSync} from "node:fs";
import {inflateRawSync} from "node:zlib";

function readUInt16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === signature) {
      return offset;
    }
  }

  throw new Error("ZIP end of central directory not found.");
}

export function readZipEntry(zipPath, entryName) {
  const buffer = readFileSync(zipPath);
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16(buffer, endOffset + 10);
  const centralDirectoryOffset = readUInt32(buffer, endOffset + 16);
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory header at ${offset}.`);
    }

    const compressionMethod = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const fullName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    if (fullName === entryName) {
      const localFileNameLength = readUInt16(buffer, localHeaderOffset + 26);
      const localExtraLength = readUInt16(buffer, localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) return compressed;
      if (compressionMethod === 8) return inflateRawSync(compressed);

      throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${entryName}.`);
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error(`ZIP entry not found: ${entryName}`);
}
