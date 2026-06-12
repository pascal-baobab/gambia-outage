// quarters.jsx — ~54 principal quarters of The Gambia grouped under macro areas.
// Real settlement/ward names (Greater Banjul wards from KMC; towns per region).
// Each: { name, status, mins, reports }. status ∈ out|partial|on.
// Attaches GPT_DATA.quarters keyed by macro-area (region) id, and helpers.

(function () {
  const Q = {
    banjul: [
      { name: 'Half Die',           status: 'out',     mins: 425, reports: 64 },
      { name: 'Soldier Town',       status: 'out',     mins: 440, reports: 52 },
      { name: 'Portuguese Town',    status: 'out',     mins: 400, reports: 38 },
      { name: 'Box Bar',            status: 'out',     mins: 415, reports: 21 },
      { name: 'Crab Island',        status: 'out',     mins: 435, reports: 18 },
      { name: 'Tobacco Road',       status: 'out',     mins: 390, reports: 14 },
      { name: 'Jollof Town',        status: 'partial', mins: 190, reports: 29 },
      { name: 'Banjul New Town',    status: 'partial', mins: 170, reports: 24 },
    ],
    kanifing: [
      { name: 'Serrekunda',         status: 'out',     mins: 365, reports: 88 },
      { name: 'Bundung',            status: 'out',     mins: 405, reports: 72 },
      { name: 'Tallinding',         status: 'out',     mins: 380, reports: 66 },
      { name: 'Latrikunda Sabiji',  status: 'out',     mins: 390, reports: 63 },
      { name: 'Dippa Kunda',        status: 'out',     mins: 370, reports: 51 },
      { name: 'Latrikunda German',  status: 'out',     mins: 355, reports: 47 },
      { name: 'Manjai Kunda',       status: 'out',     mins: 340, reports: 44 },
      { name: 'Bakoteh',            status: 'out',     mins: 320, reports: 39 },
      { name: 'New Jeshwang',       status: 'partial', mins: 220, reports: 31 },
      { name: 'Ebo Town',           status: 'partial', mins: 195, reports: 28 },
      { name: 'Kololi',             status: 'partial', mins: 230, reports: 37 },
      { name: 'Bakau',              status: 'partial', mins: 205, reports: 41 },
      { name: 'Fajara',             status: 'partial', mins: 160, reports: 26 },
      { name: 'Kotu',               status: 'on',      mins: 25,  reports: 33 },
    ],
    brikama: [
      { name: 'Brikama',            status: 'out',     mins: 310, reports: 58 },
      { name: 'Sukuta',             status: 'out',     mins: 290, reports: 36 },
      { name: 'Old Yundum',         status: 'out',     mins: 280, reports: 31 },
      { name: 'Tanji',              status: 'out',     mins: 275, reports: 24 },
      { name: 'Lamin',              status: 'partial', mins: 185, reports: 29 },
      { name: 'Gunjur',             status: 'partial', mins: 210, reports: 22 },
      { name: 'Bijilo',             status: 'partial', mins: 170, reports: 21 },
      { name: 'Brufut',             status: 'partial', mins: 165, reports: 19 },
      { name: 'Busumbala',          status: 'partial', mins: 190, reports: 18 },
      { name: 'Sanyang',            status: 'partial', mins: 200, reports: 17 },
      { name: 'Tujereng',           status: 'partial', mins: 175, reports: 12 },
      { name: 'Farato',             status: 'on',      mins: 35,  reports: 14 },
    ],
    kerewan: [
      { name: 'Farafenni',          status: 'partial', mins: 180, reports: 34 },
      { name: 'Essau',              status: 'partial', mins: 175, reports: 18 },
      { name: 'Barra',              status: 'partial', mins: 160, reports: 21 },
      { name: 'Illiasa',            status: 'partial', mins: 150, reports: 9 },
      { name: 'Kerewan',            status: 'on',      mins: 45,  reports: 12 },
      { name: 'Ngeyen Sanjal',      status: 'on',      mins: 30,  reports: 7 },
    ],
    mansakonko: [
      { name: 'Soma',               status: 'partial', mins: 170, reports: 26 },
      { name: 'Mansa Konko',        status: 'partial', mins: 140, reports: 14 },
      { name: 'Pakali Ba',          status: 'on',      mins: 40,  reports: 8 },
      { name: 'Toniataba',          status: 'on',      mins: 35,  reports: 6 },
    ],
    janjanbureh: [
      { name: 'Janjanbureh',        status: 'out',     mins: 305, reports: 38 },
      { name: 'Bansang',            status: 'out',     mins: 285, reports: 33 },
      { name: 'Brikama Ba',         status: 'out',     mins: 295, reports: 27 },
      { name: 'Kuntaur',            status: 'partial', mins: 200, reports: 19 },
      { name: 'Wassu',              status: 'partial', mins: 180, reports: 11 },
    ],
    basse: [
      { name: 'Basse Santa Su',     status: 'out',     mins: 250, reports: 42 },
      { name: 'Sabi',               status: 'out',     mins: 235, reports: 16 },
      { name: 'Gambissara',         status: 'partial', mins: 185, reports: 18 },
      { name: 'Fatoto',             status: 'partial', mins: 165, reports: 12 },
      { name: 'Diabugu',            status: 'partial', mins: 155, reports: 9 },
    ],
  };

  const SEV = { out: 0.82, partial: 0.5, on: 0.16 };
  // attach sev to each + an id
  Object.keys(Q).forEach(rid => Q[rid].forEach((qq, i) => { qq.sev = SEV[qq.status]; qq.id = `${rid}-${i}`; qq.regionId = rid; }));

  window.GPT_QUARTERS = Q;
  if (window.GPT_DATA) window.GPT_DATA.quarters = Q;

  // Aggregate per macro area: counts by status, worst status, total quarters
  window.macroSummary = function (rid) {
    const list = Q[rid] || [];
    const out = list.filter(x => x.status === 'out').length;
    const partial = list.filter(x => x.status === 'partial').length;
    const on = list.filter(x => x.status === 'on').length;
    const worst = out ? 'out' : partial ? 'partial' : 'on';
    const affected = out + partial;
    return { total: list.length, out, partial, on, worst, affected };
  };
})();
