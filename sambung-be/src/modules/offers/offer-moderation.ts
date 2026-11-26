import { ApiError } from "../../shared/api-error.ts";

export const MODERATION_MARKER = "[Catatan Pengawas]:";

export interface ExtractedModeration {
  cleanNotes: string | null;
  moderationStatus: "Sedang diminta perbaikan" | null;
  moderationIssue: string | null;
}

/**
 * Splits supervisor moderation lines out of Offer.notes without changing DB schema.
 */
export function extractModeration(rawNotes: string | null | undefined): ExtractedModeration {
  if (!rawNotes) {
    return { cleanNotes: null, moderationStatus: null, moderationIssue: null };
  }

  const lines = rawNotes.split(/\r?\n/);
  const regularLines: string[] = [];
  let latestIssue: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith(MODERATION_MARKER)) {
      const issue = trimmed.slice(MODERATION_MARKER.length).trim();
      latestIssue = issue || "Mohon periksa kembali rincian penawaran Anda.";
    } else if (trimmed.length > 0) {
      regularLines.push(line);
    }
  }

  const cleanNotes = regularLines.join("\n").trim() || null;
  return {
    cleanNotes,
    moderationStatus: latestIssue ? "Sedang diminta perbaikan" : null,
    moderationIssue: latestIssue,
  };
}

/**
 * Updates Offer.notes with a supervisor finding or clears it when resolved.
 */
export function applyModerationNote(
  rawNotes: string | null | undefined,
  action: "request_fix" | "resolve",
  note?: string
): string | null {
  const { cleanNotes } = extractModeration(rawNotes);
  if (action === "resolve") {
    return cleanNotes;
  }

  const trimmedNote = note?.trim();
  if (!trimmedNote) {
    throw new ApiError(
      422,
      "INVALID_INPUT",
      "Tuliskan catatan perbaikan terlebih dahulu sebelum mengirim ke petani."
    );
  }

  const markerLine = `${MODERATION_MARKER} ${trimmedNote}`;
  return cleanNotes ? `${cleanNotes}\n${markerLine}` : markerLine;
}

/**
 * Keeps an active supervisor finding intact when the farmer updates offer notes.
 */
export function preserveModerationMarker(
  existingNotes: string | null | undefined,
  incomingNotes: string | null | undefined
): string | null {
  const existing = extractModeration(existingNotes);
  const incomingClean = extractModeration(incomingNotes).cleanNotes;
  if (!existing.moderationIssue) {
    return incomingClean;
  }
  const markerLine = `${MODERATION_MARKER} ${existing.moderationIssue}`;
  return incomingClean ? `${incomingClean}\n${markerLine}` : markerLine;
}
