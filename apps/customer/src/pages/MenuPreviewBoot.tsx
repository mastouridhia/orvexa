import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useSessionStore } from '../store/session.js';

/**
 * Entry point for the shared public menu link (`/m/:slug`). Flips the store into
 * read-only preview mode for that restaurant and hands off to the menu. No table
 * session is opened, so the menu renders view-only (no cart / ordering / waiter).
 */
export function MenuPreviewBoot() {
  const { slug } = useParams<{ slug: string }>();
  const setPreview = useSessionStore((s) => s.setPreview);
  const previewSlug = useSessionStore((s) => s.previewSlug);

  useEffect(() => {
    if (slug && previewSlug !== slug) setPreview(slug);
  }, [slug, previewSlug, setPreview]);

  if (!slug) return <Navigate to="/" replace />;
  // Only hand off once the store reflects this slug, so the menu boots in preview.
  if (previewSlug === slug) return <Navigate to="/menu" replace />;
  return null;
}
