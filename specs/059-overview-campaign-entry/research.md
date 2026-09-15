# Research

- Decision: reuse POST /api/ads-manager/plan and the existing review editor.
  Rationale: the endpoint already checks account ownership and ads_management before planning; avoids duplicate publication code.
  Alternative: new backend endpoint rejected as unnecessary.
- Decision: keep BM identity when normalizing accounts.
  Rationale: Meta catalog supplies business_id, but app currently drops it. Research of startup/routing independently confirmed this.
  Alternative: extra Graph requests per BM rejected because the catalog already contains metadata.
- Decision: lazily load monitoring only in Accounts.
  Rationale: startup callback currently launches three spend ranges for all selected accounts even on Overview.
  Alternative: merely hiding metrics would retain unnecessary query cost.
- Decision: native JavaScript and existing styles.
  Rationale: project is not React; no framework migration required.
