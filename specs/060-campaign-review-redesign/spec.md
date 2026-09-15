# Feature Specification: Campaign Review Redesign

**Created**: 2026-09-15
**Status**: Ready for implementation
**Input**: Replace the campaign review modal with the supplied compact tile layout and repair loading screens.

## User Scenarios & Testing

### User Story 1 - Review a campaign clearly (Priority: P1)

Users receive a structured review before publication, separating account, audience, budget, content and creative details.

**Independent Test**: Prepare a campaign and verify each visible detail is presented in the supplied section and tile structure before any publication request.

**Acceptance Scenarios**:

1. **Given** a prepared draft, **When** review opens, **Then** it has header, scrollable summary and persistent footer actions.
2. **Given** account/BM, audience and content data, **When** review opens, **Then** related values appear in labelled tiles and content is preserved without unsafe HTML.
3. **Given** a selected or reused creative, **When** review opens, **Then** its preview/file state appears in the supplied creative/file pattern and can be changed.

### User Story 2 - Understand progress (Priority: P1)

Users see a stable loading screen while a draft is being prepared or published.

**Independent Test**: Delay both operations and verify each loader fits the dialog, communicates its stage and cannot expose or corrupt the underlying review.

**Acceptance Scenarios**:

1. **Given** planning is in progress, **When** the loader appears, **Then** it uses a compact, readable state within the dialog.
2. **Given** publishing is in progress, **When** the loader appears, **Then** it shows the current stage, supports reduced motion and prevents duplicate actions.
3. **Given** a failure or completion, **When** loading ends, **Then** focus and the editable/review state are restored.

### Edge Cases

- Long BM/account names, IDs and ad text wrap without horizontal overflow.
- Missing BM, Instagram or creative information is labelled rather than omitted ambiguously.
- Mobile review retains one scroll area and accessible fixed actions.

## Requirements

- **FR-001**: Review must use the supplied header, section, tile grid, creative, file and footer hierarchy.
- **FR-002**: Review must identify BM, account, IDs, destination, identity, audience, budget, title, text and creative.
- **FR-003**: Existing edit, media replacement, validation and explicit publication behavior must remain unchanged.
- **FR-004**: Planning and publication loaders must fit the dialog at desktop and mobile widths and use clear progress copy.
- **FR-005**: Loaders must respect reduced-motion preferences and restore focus after completion/failure.
- **FR-006**: The review and loaders must be keyboard accessible and safely render user/Meta values as text.

## Success Criteria

- **SC-001**: All review fields remain visible or reachable in a single scrollable summary without overflow at 320px and 1440px.
- **SC-002**: No loading screen causes the dialog or page to scroll horizontally.
- **SC-003**: A review does not publish until the explicit footer action is pressed.
- **SC-004**: Existing campaign-review browser checks and new layout/loading checks pass.

## Assumptions

- The supplied HTML is the visual/content hierarchy; project styles and current green brand tokens remain authoritative.
- Existing campaign APIs and confirmation behavior are reused.
