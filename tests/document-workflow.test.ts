import assert from "node:assert/strict";
import test from "node:test";
import { DOCUMENT_REVIEW_ACTIONS, documentStatusLabel, PENDING_DOCUMENT_EXPLANATION } from "../lib/document-workflow";

test("Pending document guidance clearly confirms upload and staff review", () => {
  assert.equal(PENDING_DOCUMENT_EXPLANATION, "Pending means your file was uploaded successfully and is awaiting staff review.");
});

test("staff review workflow exposes every supported review action", () => {
  assert.deepEqual(DOCUMENT_REVIEW_ACTIONS, ["REVIEWED", "ACCEPTED", "REJECTED", "NEEDS_REPLACEMENT"]);
  assert.equal(documentStatusLabel("NEEDS_REPLACEMENT"), "Needs Replacement");
});
