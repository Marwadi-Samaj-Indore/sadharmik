"use client";

import { Pin, PinOff, Lock, Unlock, Trash2 } from "lucide-react";
import { ICON } from "@/lib/icons";
import {
  deleteComment,
  deletePost,
  toggleCommentsLock,
  togglePin,
} from "@/app/actions/data";
import type { Post } from "@/lib/types";
import { SubmitButton } from "./SubmitButton";

/** Pin / lock / delete, shown only to committee admins. */
export function AdminPostActions({ post }: { post: Post }) {
  return (
    <div className="card-mist mt-5 p-3.5">
      <p className="mb-2.5 text-xs font-semibold text-ink-soft">Admin actions</p>
      <div className="flex flex-wrap gap-2">
        {post.type === "announcement" && (
          <form action={togglePin.bind(null, post.id)}>
            <SubmitButton pendingLabel="Working…" className="btn btn-ghost">
              {post.pinned ? <PinOff size={ICON.sm} /> : <Pin size={ICON.sm} />}
              {post.pinned ? "Unpin" : "Pin to Home"}
            </SubmitButton>
          </form>
        )}

        <form action={toggleCommentsLock.bind(null, post.id)}>
          <SubmitButton pendingLabel="Working…" className="btn btn-ghost">
            {post.commentsLocked ? <Unlock size={ICON.sm} /> : <Lock size={ICON.sm} />}
            {post.commentsLocked ? "Allow comments" : "Turn off comments"}
          </SubmitButton>
        </form>

        <form
          action={deletePost.bind(null, post.id)}
          onSubmit={(event) => {
            if (!window.confirm(`Delete "${post.title}"? This can be undone from the admin panel.`)) {
              event.preventDefault();
            }
          }}
        >
          <SubmitButton pendingLabel="Deleting…" className="btn btn-danger">
            <Trash2 size={ICON.sm} />
            Delete post
          </SubmitButton>
        </form>
      </div>
      <p className="mt-2.5 text-2xs leading-relaxed text-ink-faint">
        Deletions are recorded in the change log and can be undone.
      </p>
    </div>
  );
}

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  return (
    <form
      action={deleteComment.bind(null, commentId)}
      onSubmit={(event) => {
        if (!window.confirm("Delete this comment?")) event.preventDefault();
      }}
    >
      <SubmitButton
        aria-label="Delete comment"
        className="flex h-11 w-11 items-center justify-center rounded-chip text-ink-faint transition-colors active:bg-danger-soft active:text-danger"
      >
        <Trash2 size={ICON.sm} />
      </SubmitButton>
    </form>
  );
}
