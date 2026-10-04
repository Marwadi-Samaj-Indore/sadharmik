import Link from "next/link";
import { notFound } from "next/navigation";
import { Pin, Lock, MapPin, MessageCircle, Clock, Flame } from "lucide-react";
import { ICON } from "@/lib/icons";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BackBar, Badge } from "@/components/ui";
import { AvatarLite } from "@/components/Avatar";
import { CommentForm } from "@/components/CommentForm";
import { AdminPostActions, DeleteCommentButton } from "@/components/PostActions";
import {
  isCondolence,
  isUrl,
  photoUrl,
  relativeTime,
  whatsappLink,
  initials,
} from "@/lib/util";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [db, session] = await Promise.all([getDb(), getSession()]);

  const post =
    db.announcements.find((p) => p.id === id) ??
    db.requirements.find((p) => p.id === id);
  if (!post) notFound();

  const comments = db.comments
    .filter((c) => c.postId === post.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const author = post.authorPersonId
    ? db.people.find((p) => p.id === post.authorPersonId) ?? null
    : null;

  const daysLeft = post.expiresAt
    ? Math.max(0, Math.round((new Date(post.expiresAt).getTime() - Date.now()) / 86400000))
    : null;

  const contactNumber = author?.privacy.hideWhatsapp ? null : author?.whatsapp ?? null;
  const condolence = isCondolence(post);
  const image = photoUrl(post.photo);

  return (
    <>
      <BackBar
        label={condolence ? "Condolence" : post.type === "announcement" ? "Announcement" : "Requirement"}
        href={`/feed?tab=${post.type === "announcement" ? "announcements" : "requirements"}`}
      />

      <article className="px-4 pt-5">
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {condolence && (
            <Badge>
              <Flame size={ICON.micro} />
              Condolence
            </Badge>
          )}
          {post.pinned && !condolence && (
            <Badge tone="warn">
              <Pin size={ICON.micro} />
              Pinned
            </Badge>
          )}
          {post.category && !condolence && <Badge tone="info">{post.category}</Badge>}
          {post.area && !isUrl(post.area) && <Badge>{post.area}</Badge>}
          {post.commentsLocked && !condolence && (
            <Badge>
              <Lock size={ICON.micro} />
              Comments off
            </Badge>
          )}
        </div>

        <h1 className="text-title">{post.title}</h1>

        <div className="mt-3 flex items-center gap-2.5">
          <AvatarLite
            label={author ? initials(author) : post.authorName.charAt(0)}
            photo={author?.photo ?? null}
            size="md"
          />
          <div className="min-w-0 flex-1">
            {author ? (
              <Link
                href={`/person/${author.id}`}
                className="-my-3 block truncate py-3 text-sm font-semibold"
              >
                {post.authorName}
              </Link>
            ) : (
              <p className="truncate text-sm font-semibold">{post.authorName}</p>
            )}
            <p className="text-xs text-ink-faint">
              {relativeTime(post.createdAt)}
              {daysLeft !== null && ` · expires in ${daysLeft} days`}
            </p>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed">
          {post.body}
        </p>

        {/* Whole and uncropped. A poster's own layout is the announcement —
            trimming it to a tidy rectangle is what loses the date. */}
        {image && (
          <a href={image} target="_blank" rel="noopener noreferrer" className="mt-4 block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt={`Image posted with "${post.title}"`}
              className="w-full rounded-card border border-line-soft"
            />
          </a>
        )}

        {post.area && isUrl(post.area) && (
          <a
            href={post.area}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary mt-4 w-full"
          >
            <MapPin size={ICON.sm} />
            Open in Maps
          </a>
        )}

        {contactNumber && (
          <a
            href={whatsappLink(
              contactNumber,
              `Jai Jinendra ${author?.firstName ?? ""}, regarding your post "${post.title}" on Sadharmik —`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary mt-4 w-full"
          >
            <MessageCircle size={ICON.sm} />
            Contact on WhatsApp
          </a>
        )}

        {daysLeft !== null && daysLeft <= 5 && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
            <Clock size={ICON.xs} />
            This requirement disappears in {daysLeft} {daysLeft === 1 ? "day" : "days"}.
          </p>
        )}

        {session.isAdmin && <AdminPostActions post={post} />}
      </article>

      {/* Comments */}
      <section className="mt-7">
        <h2 className="section-title px-4 pb-2">
          {comments.length === 0
            ? "Comments"
            : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
        </h2>

        {post.commentsLocked ? (
          <p className="card-mist mx-4 flex items-center gap-2 px-4 py-3 text-sm text-ink-soft">
            <Lock size={ICON.sm} className="shrink-0" />
            {/* A condolence deserves a reason, not a mechanism — "turned off"
                reads as moderation; this reads as custom */}
            {condolence
              ? "Comments are closed on this notice. Please reach the family personally."
              : "Comments have been turned off for this post."}
          </p>
        ) : (
          <CommentForm postId={post.id} />
        )}

        {comments.length > 0 && (
          <ul className="mt-3 space-y-2 px-4">
            {comments.map((comment) => {
              const commenter = comment.authorPersonId
                ? db.people.find((p) => p.id === comment.authorPersonId) ?? null
                : null;
              const own =
                session.person && comment.authorPersonId === session.person.id;

              return (
                <li key={comment.id} className="card p-3.5">
                  <div className="flex items-start gap-2.5">
                    <AvatarLite
                      label={
                        commenter ? initials(commenter) : comment.authorName.charAt(0)
                      }
                      photo={commenter?.photo ?? null}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        {/* Real name and photo on every comment — the strongest
                            deterrent in a community where everyone knows everyone */}
                        {commenter ? (
                          <Link
                            href={`/person/${commenter.id}`}
                            className="truncate text-sm font-semibold"
                          >
                            {comment.authorName}
                          </Link>
                        ) : (
                          <span className="truncate text-sm font-semibold">
                            {comment.authorName}
                          </span>
                        )}
                        <span className="shrink-0 text-2xs text-ink-faint">
                          {relativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">
                        {comment.body}
                      </p>
                    </div>
                    {(session.isAdmin || own) && (
                      <DeleteCommentButton commentId={comment.id} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
