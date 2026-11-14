"use client";

import { useEffect, useState, type FormEvent } from "react";
import OcrActions from "./OcrActions";

type Textbook = { id: string; name: string };
type UploadedFile = {
  id: string;
  textbookId: string;
  displayName: string;
  originalName: string;
  grade: number;
  sizeBytes: number;
  status: string;
  createdAt: string;
  textbook?: Textbook | null;
};

async function parseApiResponse(response: Response): Promise<Record<string, unknown>> {
  const raw = await response.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status}).`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Phản hồi từ máy chủ không hợp lệ.");
  }
  const result = data as Record<string, unknown>;
  if (!response.ok || result.success === false) {
    throw new Error(typeof result.error === "string" ? result.error : `Yêu cầu thất bại (HTTP ${response.status}).`);
  }
  return result;
}

const statusText: Record<string, string> = {
  PENDING: "Chờ OCR",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Sẵn sàng cho AI",
  FAILED: "OCR thất bại",
};

export default function AdminTextbooksPage() {
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [textbookId, setTextbookId] = useState("");
  const [grade, setGrade] = useState(3);
  const [displayName, setDisplayName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadTextbooks() {
    const res = await fetch("/api/curriculum/textbooks", { cache: "no-store" });
    const data = await parseApiResponse(res);
    if (!Array.isArray(data.textbooks)) throw new Error("Không tải được danh sách bộ sách.");
    const books = data.textbooks.filter(
      (item): item is Textbook =>
        typeof item === "object" && item !== null &&
        typeof (item as Textbook).id === "string" &&
        typeof (item as Textbook).name === "string"
    );
    setTextbooks(books);
    setTextbookId((previous) => books.some((book) => book.id === previous) ? previous : books[0]?.id ?? "");
  }

  async function loadFiles() {
    const res = await fetch("/api/admin/textbooks/files", { cache: "no-store" });
    const data = await parseApiResponse(res);
    if (!Array.isArray(data.files)) throw new Error("Không tải được danh sách PDF.");
    setFiles(data.files as UploadedFile[]);
  }

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        await Promise.all([loadTextbooks(), loadFiles()]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Không thể tải dữ liệu.");
      } finally {
        if (active) setLoadingList(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!selectedFile || !textbookId) {
      setError("Vui lòng chọn bộ sách và file PDF.");
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setError("Vui lòng chọn file có định dạng PDF.");
      return;
    }
    if (selectedFile.size > 30 * 1024 * 1024) {
      setError("File PDF không được vượt quá 30 MB.");
      return;
    }
    if (!displayName.trim()) {
      setError("Vui lòng nhập tên tài liệu.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("textbookId", textbookId);
    formData.append("grade", String(grade));
    formData.append("displayName", displayName.trim());
    setLoading(true);
    try {
      const response = await fetch("/api/admin/textbooks/upload", {
        method: "POST",
        body: formData,
      });
      await parseApiResponse(response);
      setMessage("Upload PDF thành công. Hãy bấm xử lý OCR ở danh sách bên dưới.");
      setDisplayName("");
      setSelectedFile(null);
      const input = document.getElementById("pdfFile") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload thất bại.");
    } finally {
      setLoading(false);
    }
  }

  function formatSize(bytes: number) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý sách giáo khoa PDF</h1>
        <p className="mt-2 text-gray-600">
          Upload và OCR sách theo khối lớp. AI Generator sẽ tự tham khảo nội dung đã OCR khi tạo bài tập.
        </p>
      </header>

      <form onSubmit={handleUpload} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Upload sách giáo khoa</h2>
        <div>
          <label htmlFor="textbook" className="mb-2 block font-medium">Bộ sách</label>
          <select id="textbook" value={textbookId} onChange={(e) => setTextbookId(e.target.value)} required disabled={loading || loadingList} className="w-full rounded-lg border p-3">
            <option value="">-- Chọn bộ sách --</option>
            {textbooks.map((book) => <option key={book.id} value={book.id}>{book.name}</option>)}
          </select>
          {!loadingList && textbooks.length === 0 && <p className="mt-2 text-sm text-amber-700">Chưa có bộ sách. Hãy tạo bộ sách trước khi upload PDF.</p>}
        </div>
        <div>
          <label htmlFor="grade" className="mb-2 block font-medium">Khối lớp</label>
          <select id="grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))} disabled={loading} className="w-full rounded-lg border p-3">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((item) => <option key={item} value={item}>Lớp {item}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="displayName" className="mb-2 block font-medium">Tên tài liệu</label>
          <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ví dụ: Global Success 3 - Student Book" required maxLength={200} disabled={loading} className="w-full rounded-lg border p-3" />
        </div>
        <div>
          <label htmlFor="pdfFile" className="mb-2 block font-medium">File PDF (tối đa 30 MB)</label>
          <input id="pdfFile" type="file" accept=".pdf,application/pdf" required disabled={loading} onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} className="w-full rounded-lg border p-3" />
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
        {message && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-700">{message}</p>}
        <button type="submit" disabled={loading || loadingList || !textbookId || !selectedFile} className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Đang upload..." : "Upload PDF"}
        </button>
      </form>

      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Danh sách PDF đã upload</h2>
          <button type="button" onClick={() => { void loadFiles().catch((err) => setError(err instanceof Error ? err.message : "Không tải được danh sách PDF.")); }} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Làm mới</button>
        </div>
        {loadingList ? <p className="text-gray-500">Đang tải danh sách...</p> : files.length === 0 ? (
          <p className="text-gray-500">Chưa có tài liệu nào.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead><tr className="border-b bg-gray-50">
                <th className="p-3">Tài liệu</th><th className="p-3">Bộ sách</th><th className="p-3">Lớp</th><th className="p-3">Dung lượng</th><th className="p-3">Xử lý OCR</th><th className="p-3">Dữ liệu cho AI</th>
              </tr></thead>
              <tbody>{files.map((file) => (
                <tr key={file.id} className="border-b align-top hover:bg-gray-50">
                  <td className="p-3"><div className="font-medium text-gray-900">{file.displayName}</div><div className="mt-1 text-xs text-gray-500">{file.originalName}</div></td>
                  <td className="p-3">{file.textbook?.name || textbooks.find((book) => book.id === file.textbookId)?.name || "Không xác định"}</td>
                  <td className="p-3">Lớp {file.grade}</td>
                  <td className="p-3">{formatSize(file.sizeBytes)}</td>
                  <td className="p-3"><OcrActions fileId={file.id} status={file.status} onCompleted={() => { void loadFiles().catch((err) => setError(err instanceof Error ? err.message : "Không tải được danh sách PDF.")); }} /></td>
                  <td className="p-3"><span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${file.status === "COMPLETED" ? "bg-green-100 text-green-700" : file.status === "FAILED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{statusText[file.status] || file.status}</span>{file.status === "COMPLETED" && <p className="mt-2 text-xs text-gray-500">AI có thể tham khảo nội dung OCR của tài liệu này theo khối lớp.</p>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
