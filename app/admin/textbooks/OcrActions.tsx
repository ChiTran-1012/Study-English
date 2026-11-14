
"use client";

import { useState } from "react";

type OcrChunk = {
  id: string;
  pageNumber: number;
  content: string;
};

type Props = {
  fileId: string;
  status: string;
  onCompleted?: () => void;
};


export default function OcrActions({
  fileId,
  status,
  onCompleted,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentStatus, setCurrentStatus] = useState(status);
  const [chunks, setChunks] = useState<OcrChunk[]>([]);
  const [showChunks, setShowChunks] = useState(false);

  async function processOcr() {
    if (loading || currentStatus === "PROCESSING") return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/textbooks/files/${fileId}/process`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "OCR thất bại");
      }

      setCurrentStatus("COMPLETED");
      onCompleted?.();
      setMessage(`OCR thành công: ${data.totalPages} trang`);
    } catch (error) {
      setCurrentStatus("FAILED");
      setMessage(
        error instanceof Error ? error.message : "Có lỗi xảy ra"
      );
    } finally {
      setLoading(false);
    }
  }

  async function viewChunks() {
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/textbooks/files/${fileId}/chunks`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Không lấy được dữ liệu");
      }

      setChunks(data.chunks);
      setShowChunks(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Có lỗi xảy ra"
      );
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        Trạng thái: <strong>{currentStatus}</strong>
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={processOcr}
          disabled={loading || currentStatus === "PROCESSING"}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Xử lý OCR"}
        </button>

        <button
          type="button"
          onClick={viewChunks}
          className="rounded bg-gray-700 px-4 py-2 text-white"
        >
          Xem nội dung
        </button>
      </div>

      {message && <p className="text-sm">{message}</p>}

      {showChunks && (
        <div className="max-h-96 space-y-3 overflow-y-auto rounded border p-3">
          {chunks.length === 0 && (
            <p>Chưa có nội dung OCR.</p>
          )}

          {chunks.map((chunk) => (
            <div key={chunk.id} className="border-b pb-3">
              <h3 className="font-semibold">
                Trang {chunk.pageNumber}
              </h3>

              <pre className="mt-2 whitespace-pre-wrap break-words text-sm">
                {chunk.content || "(Không nhận diện được văn bản)"}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
