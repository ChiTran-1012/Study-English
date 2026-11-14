
"use client";

import { useEffect, useState } from "react";

type Props = {
  transcript: string;
};

export default function ListeningPlayer({
  transcript,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(0.9);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  function handlePlay() {
    if (!transcript.trim()) {
      alert("Bài nghe chưa có nội dung.");
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert("Trình duyệt không hỗ trợ phát giọng nói.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      transcript
    );

    utterance.lang = "en-US";
    utterance.rate = rate;

    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(utterance);
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-xl font-bold">
        Listening Practice
      </h2>

      <p className="mb-5 text-sm text-gray-500">
        Listen carefully and answer the questions.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePlay}
          className="rounded-lg bg-blue-600 px-5 py-3 text-white"
        >
          ▶ Play Audio
        </button>

        <button
          type="button"
          onClick={handleStop}
          disabled={!playing}
          className="rounded-lg bg-gray-200 px-5 py-3 disabled:opacity-50"
        >
          ■ Stop
        </button>

        <select
          value={rate}
          onChange={(e) =>
            setRate(Number(e.target.value))
          }
          className="rounded-lg border p-3"
        >
          <option value={0.75}>Slow</option>
          <option value={0.9}>Normal</option>
          <option value={1}>Fast</option>
        </select>
      </div>
    </div>
  );
}
