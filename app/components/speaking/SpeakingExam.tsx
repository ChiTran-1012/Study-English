
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SpeakingQuestion = {
  id: string;
  content: string;
  order?: number;
};

type Props = {
  title: string;
  questions: SpeakingQuestion[];
  assignmentId?: string;
  maxSeconds?: number;
  onRecordReady?: (questionId: string, audio: Blob) => void;
};

type Recording = {
  blob: Blob;
  url: string;
};

function chooseMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;

  return [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type));
}

function audioExtension(mime: string) {
  const type = mime.split(";")[0].toLowerCase();

  if (type === "audio/mp4") return "mp4";
  if (type === "audio/ogg") return "ogg";
  if (type === "audio/mpeg") return "mp3";
  if (type === "audio/wav" || type === "audio/x-wav") return "wav";

  return "webm";
}

type ApiResponse = {
  success?: boolean;
  message?: string;
  record?: { id?: string };
  transcript?: string;
};

async function readResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();

  if (!text) return {};

  try {
    const data: unknown = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("API khÃ´ng tráº£ vá» object JSON.");
    }
    return data as ApiResponse;
  } catch {
    throw new Error(
      `API trả về dữ liệu không hợp lệ (HTTP ${response.status}).`
    );
  }
}

export default function SpeakingExam({
  title,
  questions,
  assignmentId,
  maxSeconds = 120,
  onRecordReady,
}: Props) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [recordings, setRecordings] = useState<
    Record<string, Recording>
  >({});

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeIdRef = useRef<string | null>(null);
  const recordingsRef = useRef<Record<string, Recording>>({});
  const maxSecondsRef = useRef(maxSeconds);
  const callbackRef = useRef(onRecordReady);

  const busy = activeId !== null;

  useEffect(() => {
    maxSecondsRef.current = maxSeconds;
  }, [maxSeconds]);

  useEffect(() => {
    callbackRef.current = onRecordReady;
  }, [onRecordReady]);

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  // Dừng ghi âm
  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  // Đếm thời gian ghi âm
  useEffect(() => {
    if (!activeId) return;

    const timer = window.setInterval(() => {
      setElapsed((previous) => {
        const next = previous + 1;

        if (next >= maxSecondsRef.current) {
          stopRecording();
        }

        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeId, stopRecording]);

  // Cleanup
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      Object.values(recordingsRef.current).forEach((item) => {
        URL.revokeObjectURL(item.url);
      });
    };
  }, []);

  // Bắt đầu ghi âm
  async function startRecording(questionId: string) {
    if (busy || activeIdRef.current || submitting || submitted) {
      return;
    }

    setError("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Trình duyệt không hỗ trợ ghi âm. Hãy sử dụng Chrome hoặc Edge trên localhost/HTTPS."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const mimeType = chooseMimeType();

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      recorderRef.current = recorder;
      chunksRef.current = [];
      activeIdRef.current = questionId;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setError("Ghi âm gặp lỗi. Vui lòng thử lại.");
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        stream.getTracks().forEach((track) => track.stop());

        streamRef.current = null;
        recorderRef.current = null;
        activeIdRef.current = null;

        setActiveId(null);

        if (blob.size === 0) {
          setError("Không thu được âm thanh từ microphone.");
          return;
        }

        if (blob.size > 10 * 1024 * 1024) {
          setError(
            "Audio vượt quá 10 MB. Hãy ghi âm lại với thời lượng ngắn hơn."
          );
          return;
        }

        const url = URL.createObjectURL(blob);

        setRecordings((previous) => {
          const old = previous[questionId];

          if (old) {
            URL.revokeObjectURL(old.url);
          }

          return {
            ...previous,
            [questionId]: { blob, url },
          };
        });

        callbackRef.current?.(questionId, blob);
      };

      recorder.start(250);

      setElapsed(0);
      setActiveId(questionId);
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
      recorderRef.current = null;
      activeIdRef.current = null;

      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Bạn chưa cấp quyền sử dụng microphone."
          : "Không thể bắt đầu ghi âm."
      );
    }
  }

  // Nộp bài: lưu audio -> nhận dạng -> lưu transcript -> submit -> AI grade
  async function submitSpeaking() {
    if (
      !assignmentId ||
      busy ||
      submitting ||
      submitted
    ) {
      return;
    }

    if (questions.length === 0) {
      setError("Bài Speaking chưa có câu hỏi.");
      return;
    }

    const incomplete = questions.filter((question) => {
      const recording = recordings[question.id];

      return !recording || recording.blob.size < 1000;
    });

    if (incomplete.length > 0) {
      setError(
        `Bạn còn ${incomplete.length} câu chưa ghi âm hoặc audio không hợp lệ.`
      );
      return;
    }

    const confirmed = window.confirm(
      "Bạn có chắc chắn muốn nộp bài Speaking? Sau khi nộp sẽ không thể chỉnh sửa."
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError("");

    const baseUrl = `/api/student/assignments/${encodeURIComponent(
      assignmentId
    )}/speaking`;

    let submissionCompleted = false;

    try {
      // Xử lý lần lượt từng câu hỏi
      for (let index = 0; index < questions.length; index++) {
        const question = questions[index];
        const recording = recordings[question.id];

        if (!recording) {
          throw new Error(`Câu ${index + 1} chưa có audio.`);
        }

        const filename = `recording.${audioExtension(
          recording.blob.type
        )}`;

        const audioFile = new File(
          [recording.blob],
          filename,
          {
            type: recording.blob.type || "audio/webm",
          }
        );

        // 1. Lưu audio vào PostgreSQL
        setError(
          `Đang lưu audio câu ${index + 1}/${questions.length}...`
        );

        const audioForm = new FormData();
        audioForm.append("questionId", question.id);
        audioForm.append("audio", audioFile);

        const saveResponse = await fetch(`${baseUrl}/record`, {
          method: "POST",
          credentials: "same-origin",
          body: audioForm,
        });

        const saveData = await readResponse(saveResponse);

        if (
          !saveResponse.ok ||
          !saveData.success ||
          !saveData.record?.id
        ) {
          throw new Error(
            saveData.message ||
              `Không thể lưu audio câu ${index + 1}.`
          );
        }

        // 2. Speech-to-Text
        setError(
          `Đang nhận dạng giọng nói câu ${index + 1}/${questions.length}...`
        );

        const transcribeForm = new FormData();
        transcribeForm.append("questionId", question.id);
        transcribeForm.append("audio", audioFile);

        const transcribeResponse = await fetch(
          `${baseUrl}/transcribe`,
          {
            method: "POST",
            credentials: "same-origin",
            body: transcribeForm,
          }
        );

        const transcribeData = await readResponse(
          transcribeResponse
        );

        if (
          !transcribeResponse.ok ||
          !transcribeData.success ||
          typeof transcribeData.transcript !== "string" ||
          !transcribeData.transcript.trim()
        ) {
          throw new Error(
            transcribeData.message ||
              `Không thể nhận dạng giọng nói câu ${index + 1}.`
          );
        }

        const transcript = transcribeData.transcript.trim();

        // 3. Lưu transcript vào PostgreSQL
        setError(
          `Đang lưu nội dung câu ${index + 1}/${questions.length}...`
        );

        const transcriptResponse = await fetch(
          `${baseUrl}/transcript`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              questionId: question.id,
              transcript,
            }),
          }
        );

        const transcriptData = await readResponse(
          transcriptResponse
        );

        if (
          !transcriptResponse.ok ||
          !transcriptData.success
        ) {
          throw new Error(
            transcriptData.message ||
              `Không thể lưu transcript câu ${index + 1}.`
          );
        }
      }

      // 4. Nộp bài chính thức
      setError("Đang nộp bài Speaking...");

      const submitResponse = await fetch(`${baseUrl}/submit`, {
        method: "POST",
        credentials: "same-origin",
      });

      const submitData = await readResponse(submitResponse);

      if (!submitResponse.ok || !submitData.success) {
        throw new Error(
          submitData.message || "Không thể nộp bài Speaking."
        );
      }

      submissionCompleted = true;
      setSubmitted(true);

      // 5. Gọi AI chấm Grammar và Vocabulary
      setError("Đã nộp bài. AI đang chấm điểm...");

      const gradeResponse = await fetch(`${baseUrl}/grade`, {
        method: "POST",
        credentials: "same-origin",
      });

      const gradeData = await readResponse(gradeResponse);

      if (!gradeResponse.ok || !gradeData.success) {
        // Bài đã nộp, chỉ bước AI chấm điểm thất bại.
        router.replace(
          `/student/assignments/${encodeURIComponent(
            assignmentId
          )}?review=true&gradingError=1`
        );
        return;
      }

      // 6. Chuyển đến trang kết quả
      router.replace(
        `/student/assignments/${encodeURIComponent(
          assignmentId
        )}?review=true`
      );
    } catch (err) {
      console.error("SUBMIT SPEAKING:", err);

      if (submissionCompleted) {
        // Không cho học sinh ghi âm/nộp lại khi đã nộp thành công.
        router.replace(
          `/student/assignments/${encodeURIComponent(
            assignmentId
          )}?review=true&gradingError=1`
        );
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Có lỗi xảy ra khi xử lý bài Speaking."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Giao diện
  return (
    <section className="mx-auto max-w-4xl space-y-6 rounded-2xl bg-white p-5 shadow-sm md:p-8">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">
          {title}
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Ghi âm câu trả lời bằng tiếng Anh. Thời lượng tối đa{" "}
          {maxSeconds} giây mỗi câu.
        </p>
      </header>

      {error && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${
            submitting
              ? "border-blue-200 bg-blue-50 text-blue-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {error}
        </div>
      )}

      {questions.map((question, index) => {
        const recording = recordings[question.id];
        const isActive = activeId === question.id;

        return (
          <article
            key={question.id}
            className="space-y-4 rounded-xl border border-gray-200 p-5"
          >
            <h2 className="font-semibold text-gray-900">
              Câu {index + 1}: {question.content}
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {isActive ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  disabled={submitting}
                  className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  Dừng ghi âm ({elapsed}s)
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || submitting || submitted}
                  onClick={() => startRecording(question.id)}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
                >
                  {recording ? "Ghi âm lại" : "Bắt đầu ghi âm"}
                </button>
              )}

              {isActive && (
                <span className="font-medium text-red-600">
                  ● Đang ghi âm...
                </span>
              )}
            </div>

            {recording && !isActive && (
              <div className="space-y-3">
                <p className="text-sm text-green-700">
                  Đã ghi âm (
                  {Math.round(recording.blob.size / 1024)} KB)
                </p>

                <audio
                  controls
                  preload="metadata"
                  src={recording.url}
                  className="w-full"
                />

                <p className="text-sm text-gray-500">
                  Hãy nghe lại câu trả lời. Bạn có thể ghi âm lại
                  trước khi nộp bài.
                </p>
              </div>
            )}
          </article>
        );
      })}

      {assignmentId && (
        <div className="sticky bottom-0 rounded-xl border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-800">
                Hoàn thành bài Speaking
              </p>

              <p className="text-sm text-slate-500">
                Hệ thống sẽ tự động lưu audio, nhận dạng giọng nói
                và chấm điểm.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Đã ghi âm:{" "}
                {
                  questions.filter((q) => recordings[q.id]).length
                }
                /{questions.length} câu
              </p>
            </div>

            <button
              type="button"
              onClick={submitSpeaking}
              disabled={
                busy ||
                submitting ||
                submitted ||
                questions.length === 0 ||
                questions.some((q) => !recordings[q.id])
              }
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting
                ? "Đang xử lý bài Speaking..."
                : submitted
                  ? "Đã nộp bài"
                  : "Nộp bài và chấm điểm"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
