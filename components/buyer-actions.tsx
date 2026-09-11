"use client";

import { useState, useTransition } from "react";

import { addNote, changeStatus, logContact } from "@/lib/actions";
import { BUYER_STATUSES, BUYER_STATUS_LABELS } from "@/lib/domain";

/** Changing this writes an activity automatically, so the history stays whole. */
export function StatusSelector({
  buyerId,
  status,
}: {
  buyerId: string;
  status: string;
}) {
  const [pending, start] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Status
      <select
        value={status}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          start(() => {
            void changeStatus(buyerId, next);
          });
        }}
        className="rounded-md border border-rule bg-surface px-2.5 py-1.5 text-sm text-ink disabled:opacity-60"
      >
        {BUYER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {BUYER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Stamps the buyer as contacted today, which clears their check-in flag. */
export function LogContactButton({ buyerId }: { buyerId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => void logContact(buyerId))}
      className="rounded-md bg-gum px-4 py-2 text-base font-semibold text-white hover:bg-[#275948] disabled:opacity-60"
    >
      {pending ? "Logging contact" : "Log contact"}
    </button>
  );
}

/** Add a note to the timeline. */
export function NoteBox({ buyerId }: { buyerId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        start(async () => {
          const result = await addNote(buyerId, formData);
          if (result?.error) setError(result.error);
        });
      }}
      className="mb-4"
    >
      <label htmlFor="note-body" className="sr-only">
        Add a note
      </label>
      <textarea
        id="note-body"
        name="body"
        rows={3}
        required
        placeholder="Add a note about this buyer"
        className="w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
      />
      {error && (
        <p role="alert" className="mt-1 text-sm text-brick">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md border border-rule px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60"
      >
        {pending ? "Saving note" : "Save note"}
      </button>
    </form>
  );
}
