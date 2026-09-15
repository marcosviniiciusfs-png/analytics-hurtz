# Feature Specification: Review Modal Polish

**Created**: 2026-09-15
**Status**: Ready for preview
**Input**: Remove the repeated and unrelated content in campaign review, match the supplied 1040 px modal proportion, and make loading states immediate and stable.

## User Scenarios & Testing

### User Story 1 - Review one coherent campaign summary (Priority: P1)

Users see one review header, a 1040 px maximum dialog, the supplied compact summary column and one persistent action footer.

**Acceptance Scenarios**:

1. The editor header is not displayed behind the review header.
2. BM/account names and IDs are separate labelled tiles; audience details are not repeated in the budget tile.
3. The review scrolls only in its summary area, while Edit and Publish remain visible.

### User Story 2 - Understand loading without visual delay (Priority: P1)

Users see one immediate, contained loader during preparation and publication.

**Acceptance Scenarios**:

1. A loader appears at the start of the operation without revealing duplicate editor content.
2. Loader content fits desktop and mobile dialogs and reports its stage without decorative decks or queued transitions.
3. Video readiness retries update frequently enough to communicate progress without a five-second blank wait.

## Requirements

- **FR-001**: The review must use the supplied single-header, 1040 px maximum modal proportion and 640 px summary column.
- **FR-002**: Review tiles must separate BM name/ID, account name/ID, location, state/country, age and daily budget.
- **FR-003**: Preparation and publication loaders must have a single visible state and remain within the dialog.
- **FR-004**: Browser coverage must check the non-duplicated header, tile labels, dialog width, responsive scrolling and loaders.
- **FR-005**: A local preview must be provided before deployment.

## Success Criteria

- **SC-001**: At 1440 px and 390 px widths, review has one visible title and no horizontal overflow.
- **SC-002**: The dialog content is no wider than 1040 px at desktop widths.
- **SC-003**: Campaign review browser checks pass before preview.
