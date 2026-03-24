import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink, readFile, stat } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || "20971520"); // 20MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export function validateFile(mimeType: string, size: number): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `不支持的文件类型: ${mimeType}。支持: PDF, JPG, PNG, DOCX`;
  }
  if (size > MAX_FILE_SIZE) {
    return `文件大小超过限制: ${(size / 1024 / 1024).toFixed(1)}MB，最大 20MB`;
  }
  return null;
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = path.extname(originalName) || getExtFromMime(mimeType);
  const storedName = `${randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, storedName);
  await writeFile(filePath, buffer);
  return storedName;
}

export async function getFile(storedName: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, storedName);
  return readFile(filePath);
}

export async function deleteFile(storedName: string): Promise<void> {
  const filePath = path.join(UPLOAD_DIR, storedName);
  try {
    await unlink(filePath);
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e.code !== "ENOENT") throw e;
  }
}

export async function fileExists(storedName: string): Promise<boolean> {
  try {
    await stat(path.join(UPLOAD_DIR, storedName));
    return true;
  } catch {
    return false;
  }
}

function getExtFromMime(mime: string): string {
  switch (mime) {
    case "application/pdf": return ".pdf";
    case "image/jpeg": return ".jpg";
    case "image/png": return ".png";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": return ".docx";
    default: return "";
  }
}
