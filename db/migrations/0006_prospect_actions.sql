-- Soft-delete flag for prospects, backing the admin-ui "Archive" action.
-- Not a hard DELETE: keeps the row (and its events history) intact per
-- db/CLAUDE.md's append-only events invariant, just hidden from the
-- default list.

ALTER TABLE prospects ADD COLUMN archived BOOLEAN NOT NULL DEFAULT false;
