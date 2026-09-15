# Data Model

- Brief: description string, trimmed length 12 to 1500 characters; retained on failure/back navigation within the session.
- Destination: id (required authorized account ID), name, currency, businessId, business. Deduplicate by normalized account ID; missing BM explicitly labelled.
- Composer state: describe -> select (when ambiguous) -> preparing -> review. Failure returns to prior state; hidden/navigation invalidates pending work.
- Review: immutable destination snapshot tied to account query parameter; changing destination requires a fresh preparation. Publication remains explicit.
