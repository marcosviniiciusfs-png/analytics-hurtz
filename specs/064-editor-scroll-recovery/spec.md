# Feature Specification: Editor Scroll Recovery

**Created**: 2026-09-15
**Status**: Ready for local preview
**Input**: Restore a clean, usable editable campaign form after returning from review.

## User Scenarios & Testing

### User Story 1 - Edit a reviewed campaign (Priority: P1)

After selecting Edit in the review, users can scroll every field and return to review without clipped content.

**Acceptance Scenarios**:

1. The dialog exits review-only overflow rules as soon as the review becomes hidden.
2. The editor has exactly one vertical scroll container and its header remains visible.
3. At a 390 px and desktop viewport, the user can reach the creative field and Review button.

## Requirements

- **FR-001**: Review overflow rules must only apply while the review is visible.
- **FR-002**: The editor form must scroll inside the dialog, without horizontal overflow or a clipped footer.
- **FR-003**: Browser coverage must navigate Edit, scroll the form and reopen review.
- **FR-004**: A local preview must precede deployment.

## Success Criteria

- **SC-001**: In a constrained editor viewport, setting scroll position reaches the end of the editable form.
- **SC-002**: Existing review, upload and publishing tests remain green.
