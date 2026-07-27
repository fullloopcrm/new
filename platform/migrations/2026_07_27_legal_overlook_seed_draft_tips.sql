-- Draft candidate tips for the Legal Overlook library. Every row is
-- is_active = false and titled [DRAFT] — none of this reaches a tenant
-- until a real attorney reviews it and someone flips it active via
-- /admin/legal-tips. No statute numbers or specific legal claims are
-- included here on purpose — nothing is asserted, only flagged for a real
-- attorney to check and rewrite.

insert into legal_tips (title, body, trade_key, state_code, source_citation, is_active) values
  ('[DRAFT] Confirm business license is current', 'Your license information isn''t on file. Most trades require an active state or local business license — confirm your requirement and renewal timeline with a licensed attorney.', null, null, null, false),
  ('[DRAFT] Confirm liability insurance is active', 'No insurance information is on file. General liability coverage is commonly required or expected for home service businesses — confirm what''s required in your state and trade with a licensed attorney.', null, null, null, false),
  ('[DRAFT] Renewal deadlines vary by state', 'License renewal timelines and grace periods vary significantly by state. Confirm your state''s specific deadline and any late-renewal penalty with a licensed attorney before it lapses.', null, null, null, false),
  ('[DRAFT] Trade-specific bonding requirement', 'Some trades require a surety bond in addition to a license and insurance. Confirm whether your trade and state require one, and the minimum bond amount, with a licensed attorney.', 'plumbing', null, null, false),
  ('[DRAFT] Written estimates / disclosures', 'Some states require written estimates, contracts, or specific disclosures before starting work above a certain dollar amount. Confirm your state''s requirement with a licensed attorney.', null, null, null, false)
on conflict do nothing;

-- Wire each draft tip to a trigger so it's ready to test once activated.
insert into legal_tip_triggers (tip_id, trigger_type, days_before)
select id, 'license_missing', null::integer from legal_tips where title = '[DRAFT] Confirm business license is current'
union all
select id, 'insurance_missing', null::integer from legal_tips where title = '[DRAFT] Confirm liability insurance is active'
union all
select id, 'license_expiring', 30::integer from legal_tips where title = '[DRAFT] Renewal deadlines vary by state'
union all
select id, 'license_missing', null::integer from legal_tips where title = '[DRAFT] Trade-specific bonding requirement'
union all
select id, 'always', null::integer from legal_tips where title = '[DRAFT] Written estimates / disclosures';
