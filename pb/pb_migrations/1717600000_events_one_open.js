/// <reference path="../pb_data/types.d.ts" />
// events_one_open — DB-level guard against the merge TOCTOU race. Two concurrent OUT reports for a
// zone with no open event can both fall into mergeOut()'s "create" branch (PB/SQLite has no
// row-level locking), producing TWO open events for one zone → double-counted outage minutes when
// both later close. This partial unique index makes the second insert fail at the DB, so only one
// open event per zone can ever exist; the loser is caught by the report hook's post-merge try/catch
// (logged, report still persists) and reconciled by the next report / the 5-min decay cron.
//
// A zone may still have many CLOSED events over time (the index only constrains status='open'), so
// load-shedding flicker (close → new OUT → new open event) is unaffected.
migrate(
  (app) => {
    // Defensive: collapse any pre-existing duplicate open events (keep the oldest) so the unique
    // index can be created on live data. Idempotent — a no-op when there are none.
    const open = app.findRecordsByFilter('events', "status = 'open'", 'zone,started_at', 100000, 0)
    const seen = {}
    for (let i = 0; i < open.length; i++) {
      const z = open[i].get('zone')
      if (seen[z]) {
        const ev = open[i]
        ev.set('status', 'closed')
        if (!ev.getString('ended_at')) ev.set('ended_at', ev.getString('last_activity_at') || ev.getString('started_at'))
        ev.set('auto_closed', true)
        try { app.save(ev) } catch (_) {}
      } else {
        seen[z] = true
      }
    }
    const events = app.findCollectionByNameOrId('events')
    const idx = events.indexes || []
    idx.push("CREATE UNIQUE INDEX idx_events_one_open ON events (zone) WHERE status = 'open'")
    events.indexes = idx
    app.save(events)
  },
  (app) => {
    const events = app.findCollectionByNameOrId('events')
    events.indexes = (events.indexes || []).filter((s) => !/idx_events_one_open/.test(s))
    app.save(events)
  },
)
