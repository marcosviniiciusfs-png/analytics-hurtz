# Feature Specification: Minimal Campaign Flow

**Created**: 2026-09-15
**Status**: Ready for local preview
**Input**: Render an immediate loading state in Overview and make the campaign review dialog minimal rather than wide.

## User Scenarios & Testing

### User Story 1 - See preparation immediately (Priority: P1)

After selecting an account and preparing a campaign, the user sees an immediate focused loading panel instead of a disabled form.

**Acceptance Scenarios**:

1. The selected account is preserved and the composer switches to a single visible loading state on submit.
2. The loading panel is contained, announces progress and does not expose inactive controls.
3. On failure, the editable composer returns with a clear status message.

### User Story 2 - Review in a compact dialog (Priority: P1)

The campaign review uses a compact dialog sized for its 640 px summary, with one header and footer.

**Acceptance Scenarios**:

1. Desktop dialog width is no more than 760 px.
2. BM/account IDs use the current version of the campaign module rather than a cached prior module.
3. Mobile maintains the same single scroll area and fixed action footer.

## Requirements

- **FR-001**: Overview preparation must render a visible loader immediately.
- **FR-002**: The overview composer and review dialog must use compact desktop widths.
- **FR-003**: Dynamic campaign-module cache version must change with this release.
- **FR-004**: Browser checks must cover the overview loader and compact review width.
- **FR-005**: A local preview must be made available before deployment.

## Success Criteria

- **SC-001**: A deliberately delayed plan request displays the loading panel within one animation frame.
- **SC-002**: Review dialog is at most 760 px wide at a 1440 px viewport and has no horizontal overflow at 390 px.
