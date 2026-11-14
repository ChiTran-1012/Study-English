
"use client";

import ListeningPlayer from
  "@/app/components/listening/ListeningPlayer";

export default function ListeningTestPage() {
  const transcript = `
    Hello! My name is Tom.
    I am ten years old.
    I live in Hanoi with my family.
    Every morning, I get up at six o'clock.
    I go to school at seven o'clock.
    My favorite subject is English.
  `;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">
        Listening Test
      </h1>

      <ListeningPlayer transcript={transcript} />

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="font-bold">
          Question 1
        </h2>

        <p className="mt-2">
          How old is Tom?
        </p>

        <p className="mt-4 text-gray-500">
          A. Eight years old
        </p>
        <p className="text-gray-500">
          B. Ten years old
        </p>
        <p className="text-gray-500">
          C. Twelve years old
        </p>
      </div>
    </div>
  );
}
