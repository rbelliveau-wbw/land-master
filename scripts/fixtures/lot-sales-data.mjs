// Synthetic records only. Never included in hosted widget releases.
export function salesFixture(now = new Date()) {
  const data = { lots: [], subdivisions: [], projects: [], builders: [] };
  const territories = ['Bryan / College Station', 'Fort Hood', 'North Austin', 'San Antonio', 'Temple / Belton', 'Waco'];
  const names = ['Cedar Hollow', 'Copper Ridge', 'Juniper Creek', 'Oak Meadow', 'Stonebridge', 'Willow Bend'];
  data.builders = ['Atlas Homes', 'Cedar Homebuilders', 'Pioneer Living', 'Other', 'Placeholder'].map((name, i) => ({ ID: 'b' + i, Builder_Name: name, Type1: 'Builder' }));
  data.builders.push({ID:'seller-only',Builder_Name:'A Seller Only',Type1:'Seller'});
  let sequence = 1;
  for (let t = 0; t < territories.length; t++) {
    const pid = 'p' + t; data.projects.push({ ID: pid, Project_Name: names[t] });
    for (let phase = 1; phase <= 3; phase++) {
      const sid = 's' + t + phase, name = names[t] + ' — Phase ' + String(phase).padStart(2, '0');
      data.subdivisions.push({ ID: sid, Subdivision_Name: name, Project: { ID: pid, display_value: names[t] }, Territory: territories[t] });
      for (let ago = 0; ago < 31; ago++) {
        if ((t + phase + ago) % 7 === 0) continue;
        const month = new Date(now.getFullYear(), now.getMonth() - ago, 1);
        const date = month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0') + '-08';
        for (let lot = 1; lot <= 2 + (t + phase + ago) % 5; lot++) {
          const width = [40, 45, 50, 55, 60][(lot + phase) % 5], priceFF = 680 + t * 95 + phase * 40 + (18 - ago) * 7;
          data.lots.push({ ID: String(9000000000000000000n + BigInt(sequence++)), Subdivision: { ID: sid, display_value: name }, Status: t === 0 && phase === 1 ? 'Sold' : lot === 1 && ago < 2 ? 'Contracted' : 'Sold',
            Close_Date: lot === 1 && ago < 2 ? '' : date, Purchase_Date: date, Base_Price: sequence % 37 === 0 ? '' : String(priceFF * width), Lot_Size: sequence % 43 === 0 ? '0' : String(width),
            Interest1: sequence % 5 === 0 ? String(width * 25) : '', Escalator: sequence % 5 === 0 ? '3.5' : '', Notes: sequence % 11 === 0 ? 'Synthetic interest review note' : '',
            Builder1: data.builders[(lot + t) % 3] ? { ID: data.builders[(lot + t) % 3].ID, display_value: data.builders[(lot + t) % 3].Builder_Name } : '',
            Lot_Code: 'DEMO-' + sid.toUpperCase() + '-B01-L' + sequence, Block: '01', Lot_Number: String(sequence), Archived: ago > 12 });
        }
      }
    }
  }
  data.lots.push({ ...data.lots[0], ID: '9999999999999999998', Builder1: { ID: 'b3', display_value: 'Other' } });
  return data;
}
