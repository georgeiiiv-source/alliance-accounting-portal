export const PENDING_DOCUMENT_EXPLANATION = "Pending means your file was uploaded successfully and is awaiting staff review.";

export const DOCUMENT_REVIEW_ACTIONS = ["REVIEWED", "ACCEPTED", "REJECTED", "NEEDS_REPLACEMENT"] as const;

export function documentStatusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
}
