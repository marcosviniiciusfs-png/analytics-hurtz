# UI and integration contract

initializeOverviewCampaign({mount,getAccounts,isReady,isConnected,prepare,connect}) returns {setVisible,refresh}.
prepare(account,description,isCurrent) must ignore stale work and open existing review only after authorized plan success. It never publishes ads.
Account options display business identity, account name and ID. Sole known BM/account is automatic; missing BM metadata requires explicit account choice.
POST /api/ads-manager/plan?account=<authorized ID> keeps existing {description} request and {draft,reviewRequired} response. No API schema changes.
Editor review displays BM name/ID or explicit unavailable label and account name/ID in the review definition list.
