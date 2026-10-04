"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Send } from "lucide-react";
import { ICON } from "@/lib/icons";
import { addComment } from "@/app/actions/data";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Post comment"
      className="btn btn-primary shrink-0 px-4"
    >
      <Send size={ICON.sm} />
      {pending ? "Posting…" : "Post"}
    </button>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addComment(postId, formData);
        formRef.current?.reset();
      }}
      className="px-4"
    >
      <label htmlFor={`comment-${postId}`} className="sr-only">
        Write a comment
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={`comment-${postId}`}
          name="body"
          required
          rows={2}
          maxLength={800}
          placeholder="Reply to help, or share a recommendation…"
          className="field min-h-[2.75rem] flex-1 resize-none"
        />
        <SubmitButton />
      </div>
      <p className="mt-1.5 text-2xs text-ink-faint">
        Your name and photo are shown with your comment.
      </p>
    </form>
  );
}
