# Feature Specification: Campaign entry on Overview

**Created**: 2026-09-15
**Status**: Ready for implementation
**Input**: Replace overview metrics with campaign description, choose BM/account after typing, automatically use a sole BM/account, show destination in review.

## User Scenarios & Testing

### User Story 1 - Describe a campaign (Priority: P1)

Users open Overview and describe the campaign in a single text field.
**Why this priority**: Makes campaign creation the main entry point.
**Independent Test**: Open Overview, enter a description, continue without seeing monitoring metrics.
**Acceptance Scenarios**:
1. Given Overview, when opened, then a labelled description field and Continue action replace the metric cards and monitoring controls.
2. Given an empty description, when continued, then inline validation prevents progression.
3. Given a valid description, when continued, then the draft is preserved through account selection and review.

### User Story 2 - Choose the publication account (Priority: P1)

Users choose among their authorized accounts after describing the campaign.
**Why this priority**: Prevents preparing a campaign for the wrong business.
**Independent Test**: Test one BM/one account, one BM/multiple accounts, and multiple BMs.
**Acceptance Scenarios**:
1. Given exactly one BM and one account, when continued, then that destination is selected automatically.
2. Given multiple accounts, when continued, then a selector identifies account names, IDs and BM; no arbitrary account is preselected.
3. Given no available accounts, when continued, then an actionable connection message appears without losing the description.

### User Story 3 - Review the destination (Priority: P1)

Users review the BM and ad account together with the prepared campaign before publishing.
**Why this priority**: Makes automatic and manual selection visible before any spend.
**Independent Test**: Open a prepared draft and its final review, verify BM/account names and IDs.
**Acceptance Scenarios**:
1. Given a selected destination, when review opens, then BM/account names and IDs are visible.
2. Given draft review, when edited, then the selected destination remains consistent.
3. Given an unconfirmed draft, then no campaign is published.

### Edge Cases

- Missing BM metadata is explicitly labelled unavailable; never invent a BM.
- Duplicate account entries are deduplicated by account ID.
- Planning failure preserves description and selection and allows retry.
- Navigation during preparation discards stale responses.
- Missing management authorization displays a reconnect action; server authorization remains authoritative.

## Requirements

### Functional Requirements

- **FR-001**: Overview must show campaign entry instead of dashboard metrics and their controls.
- **FR-002**: Selection must follow description entry, with automatic selection only for an unambiguous destination.
- **FR-003**: Account selection must use the connected user's authorized catalog and ignore monitoring profile filters.
- **FR-004**: Both draft and final review must identify BM and ad account, including IDs when available.
- **FR-005**: Existing campaign editing, media upload, validation and explicit publication confirmation must remain usable.
- **FR-006**: Opening Overview must not trigger spend/history queries solely for removed metrics.
- **FR-007**: The flow must support keyboard use and 320px mobile layouts without horizontal overflow.
- **FR-008**: Automated browser tests must verify destination selection, review, failure/retry and absence of automatic publication.

### Key Entities

- Campaign brief: user-authored description retained during preparation.
- Publication destination: authorized ad account and its business identity.
- Campaign draft: editable plan prepared for the selected destination.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A single-destination user reaches preparation without choosing a BM or account.
- **SC-002**: Every multi-account scenario requires an explicit destination choice.
- **SC-003**: Every review identifies the chosen account and the available BM information.
- **SC-004**: No campaign is published merely by entering text or selecting a destination.
- **SC-005**: Overview renders without metric cards or horizontal overflow at 320px and desktop widths.

## Assumptions

- Existing authenticated Meta connection and campaign creation flow are reused.
- One BM with multiple accounts also requires account selection.
- Accounts without BM metadata remain selectable with the missing information labelled.
- Publication requires the existing final confirmation; testing uses mocks, never live ad creation.
