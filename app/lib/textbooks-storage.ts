
import "server-only";

import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";

export const TEXTBOOK_STORAGE_DIR = path.join(
  process.cwd(),
  "storage",
  "textbooks"
);

export const MAX_PDF_SIZE = 30 * 1024 * 1024;

export async function saveTextbookPdf(
  buffer: Buffer
): Promise<string> {
  await mkdir(TEXTBOOK_STORAGE_DIR, {
    recursive: true,
  });

  const storageKey = `${randomUUID()}.pdf`;

  await writeFile(
    path.join(TEXTBOOK_STORAGE_DIR, storageKey),
    buffer,
    { flag: "wx" }
  );

  return storageKey;
}

export async function deleteTextbookPdf(
  storageKey: string
) {
  if (!/^[a-f0-9-]{36}\.pdf$/.test(storageKey)) {
    throw new Error("Storage key không hợp lệ");
  }

  await unlink(
    path.join(TEXTBOOK_STORAGE_DIR, storageKey)
  );
}
