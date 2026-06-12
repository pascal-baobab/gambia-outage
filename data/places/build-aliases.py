#!/usr/bin/env python3
# build-aliases.py — generate the search-alias index for the ReportSheet.
#
# WHY: the app keeps 55 canonical quarters (list/map/events/trust). But locals search by tiny
# sub-village names ("Ghana Town", hamlets) that aren't canonical. This pulls EVERY named place
# node in The Gambia from OpenStreetMap (Overpass) so they're FINDABLE by name — each alias then
# resolves client-side to the nearest canonical quarter (same as GPS snap). No new zones, no list
# bloat, no trust fragmentation.
#
# Source: OSM via Overpass (same lineage as the original HOTOSM seed). Output is COMMITTED
# (web/public/places.json) so deploys never depend on Overpass being up. Re-run to refresh.
#
# Usage: python3 data/places/build-aliases.py   (writes web/public/places.json)
import json, sys, time, urllib.parse, urllib.request, pathlib, unicodedata

OVERPASS = "https://overpass-api.de/api/interpreter"
# meaningful settlement types locals use; drop noise (compound/square/allotments/isolated_dwelling/locality)
KEEP = {"city", "town", "village", "hamlet", "suburb", "neighbourhood", "quarter"}
QUERY = """
[out:json][timeout:180];
area["ISO3166-1"="GM"][admin_level=2]->.gm;
node["place"](area.gm);
out tags;
"""  # NB: `out tags` omits lat/lon — we need geometry, so we use `out;` below instead.
QUERY = QUERY.replace("out tags;", "out;")

def fetch():
    # If a raw Overpass JSON file is passed (argv[1]), read it — avoids SSL/cert issues in some
    # Python builds. Otherwise hit Overpass directly. To refresh the raw file:
    #   curl -A 'gambiaoutage-seed/1.0' -G https://overpass-api.de/api/interpreter \
    #        --data-urlencode 'data=[out:json][timeout:180];area["ISO3166-1"="GM"][admin_level=2]->.gm;node["place"](area.gm);out;' \
    #        -o /tmp/gm_places.json
    if len(sys.argv) > 1:
        return json.load(open(sys.argv[1]))
    data = urllib.parse.urlencode({"data": QUERY}).encode()
    req = urllib.request.Request(OVERPASS, data=data,
        headers={"User-Agent": "gambiaoutage-seed/1.0 (alias index)"})
    with urllib.request.urlopen(req, timeout=200) as r:
        return json.load(r)

def norm(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().strip().lower()

# ── region point-in-polygon (real macro boundaries) — mirrors pb_hooks/lib/go.js regionContains ──
def _point_in_ring(lng, lat, ring):
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > lat) != (yj > lat)) and lng < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi:
            inside = not inside
        j = i
    return inside

def load_regions():
    root = pathlib.Path(__file__).resolve().parents[2]
    rp = json.load(open(root / "data" / "geo" / "region-polygons.json"))
    regions = []
    for rid, gj in rp.items():
        bb = gj.get("bbox")
        polys = [poly[0] for poly in gj.get("coordinates", []) if poly]  # outer rings
        regions.append((rid, bb, polys))
    return regions

def region_of(lat, lng, regions):
    for rid, bb, polys in regions:
        if bb and (lng < bb[0] or lng > bb[2] or lat < bb[1] or lat > bb[3]):
            continue
        for ring in polys:
            if _point_in_ring(lng, lat, ring):
                return rid
    return None

def main():
    j = fetch()
    regions = load_regions()
    seen = {}  # norm-name+rounded-coord → dedup
    out = []
    nomatch = 0
    for e in j.get("elements", []):
        t = e.get("tags", {})
        if t.get("place") not in KEEP:
            continue
        name = (t.get("name") or "").strip()
        lat, lng = e.get("lat"), e.get("lon")
        if not name or lat is None or lng is None:
            continue
        key = norm(name) + f"|{round(lat,3)},{round(lng,3)}"
        if key in seen:
            continue
        seen[key] = True
        rec = {"name": name, "lat": round(lat, 6), "lng": round(lng, 6)}
        r = region_of(lat, lng, regions)  # macro region id via real boundaries (None if offshore/gap)
        if r:
            rec["r"] = r
        else:
            nomatch += 1
        out.append(rec)
    out.sort(key=lambda x: x["name"])
    dest = pathlib.Path(__file__).resolve().parents[2] / "web" / "public" / "places.json"
    dest.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {len(out)} aliases → {dest} ({dest.stat().st_size} bytes); {nomatch} without a region (PiP miss)")

if __name__ == "__main__":
    main()
