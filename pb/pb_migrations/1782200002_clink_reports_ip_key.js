/// <reference path="../pb_data/types.d.ts" />
// 1782200002_clink_reports_ip_key.js — close the censorship side of the Sybil weakness.
//
// reportCommunityLink() auto-hides a community card once COMMUNITY_LINK_REPORT_FLOOR DISTINCT rl_keys
// report it. rl_key embeds the attacker-controlled UA, so ONE IP rotating User-Agents mints the floor
// in distinct "reporters" and censors a legitimate post. ip_key (salted-hashed IP, daily rotation,
// same anonymity class as the rl_key already on this anti-abuse table) lets the auto-hide require the
// floor in distinct NETWORKS, not distinct UAs. hidden: true — never returned by any API.
migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('community_link_reports')
    c.fields.add(new Field({ name: 'ip_key', type: 'text', max: 64, hidden: true }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('community_link_reports')
    c.fields.removeByName('ip_key')
    app.save(c)
  },
)
