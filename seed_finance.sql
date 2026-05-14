-- Seed: estimates
INSERT INTO estimates (id, tenant_id, number, client, email, facility_type, sq_ft, date, status, items) VALUES
  (gen_random_uuid(), 'b5e8a1c0-4f2d-4e8b-9c3a-1d7f6e5b4a2c', 'EST-2026-011', 'Greg Whitfield', 'gwhitfield@whitfieldmu.gov', 'Water Tank', 18000, 'Apr 26', 'Sent', '[{"desc":"Surface prep & blast cleaning (18,000 sq ft)","qty":18000,"price":2.80},{"desc":"Polyurea coating system - 250 mil DFT","qty":18000,"price":6.40},{"desc":"Materials - polyurea resin & hardener","qty":1,"price":42000},{"desc":"Equipment transport & mobilization","qty":1,"price":8200},{"desc":"Per diem (4 crew, 18 days)","qty":72,"price":185}]'),
  (gen_random_uuid(), 'b5e8a1c0-4f2d-4e8b-9c3a-1d7f6e5b4a2c', 'EST-2026-012', 'Sandra Polk', 'spolk@polkcommercial.com', 'Commercial Floor', 42000, 'May 1', 'Draft', '[{"desc":"Surface preparation & grinding (42,000 sq ft)","qty":42000,"price":1.20},{"desc":"Polyurea floor coating - 125 mil DFT","qty":42000,"price":3.80},{"desc":"Materials","qty":1,"price":68000},{"desc":"Equipment & mobilization","qty":1,"price":11400},{"desc":"Per diem (4 crew, 12 days)","qty":48,"price":185}]');

-- Seed: invoices
INSERT INTO invoices (id, tenant_id, number, client, email, project, amount, paid, due, status, notes, sent_messages) VALUES
  (gen_random_uuid(), 'b5e8a1c0-4f2d-4e8b-9c3a-1d7f6e5b4a2c', 'INV-2026-018', 'Rogers Water Authority',    '', 'Water Tank Polyurea Coating', 248000, 161200, '2026-05-16', 'Partial', '[]', '[]'),
  (gen_random_uuid(), 'b5e8a1c0-4f2d-4e8b-9c3a-1d7f6e5b4a2c', 'INV-2026-019', 'Walmart Supercenter #1482', '', 'Polyurea Floor Coating',       141200,  56480, '2026-05-14', 'Partial', '[]', '[]'),
  (gen_random_uuid(), 'b5e8a1c0-4f2d-4e8b-9c3a-1d7f6e5b4a2c', 'INV-2026-015', 'Daisy BB Gun Mfg Plant',   '', 'Manufacturing Floor Coating',   88400,  88400, '2026-04-25', 'Paid',    '[]', '[]'),
  (gen_random_uuid(), 'b5e8a1c0-4f2d-4e8b-9c3a-1d7f6e5b4a2c', 'INV-2026-016', 'Greenfield Water District', '', 'Water Tank Re-coat',           164000,      0, '2026-04-10', 'Overdue', '[]', '[]');
