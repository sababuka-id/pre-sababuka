BEGIN;

ALTER TABLE sababuka.periods DROP CONSTRAINT periods_type_check;
ALTER TABLE sababuka.periods ADD CONSTRAINT periods_type_check
  CHECK (period_type IN ('annual','semester','quarter','monthly','weekly','custom'));

ALTER TABLE sababuka.indicator_versions DROP CONSTRAINT indicator_versions_frequency_check;
ALTER TABLE sababuka.indicator_versions ADD CONSTRAINT indicator_versions_frequency_check
  CHECK (frequency IN ('annual','semester','quarter','monthly','weekly','event','custom'));

INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'annual','Y' || year_value,'Tahun ' || year_value,
       make_date(year_value,1,1),make_date(year_value,12,31)
FROM generate_series(2024,2029) AS year_value
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'semester',year_value || '-S' || semester_value,
       'Semester ' || semester_value || ' Tahun ' || year_value,
       make_date(year_value,CASE semester_value WHEN 1 THEN 1 ELSE 7 END,1),
       (make_date(year_value,CASE semester_value WHEN 1 THEN 1 ELSE 7 END,1) + interval '6 months - 1 day')::date
FROM generate_series(2024,2029) AS year_value
CROSS JOIN generate_series(1,2) AS semester_value
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'quarter',year_value || '-Q' || quarter_value,
       'Triwulan ' || quarter_value || ' Tahun ' || year_value,
       make_date(year_value,1 + ((quarter_value - 1) * 3),1),
       (make_date(year_value,1 + ((quarter_value - 1) * 3),1) + interval '3 months - 1 day')::date
FROM generate_series(2024,2029) AS year_value
CROSS JOIN generate_series(1,4) AS quarter_value
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'monthly',year_value || '-M' || lpad(month_value::text,2,'0'),
       to_char(make_date(year_value,month_value,1),'TMMonth YYYY'),
       make_date(year_value,month_value,1),
       (make_date(year_value,month_value,1) + interval '1 month - 1 day')::date
FROM generate_series(2024,2029) AS year_value
CROSS JOIN generate_series(1,12) AS month_value
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.periods (period_type,code,label,starts_on,ends_on)
SELECT 'weekly','W-' || to_char(week_start,'YYYY-MM-DD'),
       'Minggu ' || to_char(week_start,'DD Mon YYYY') || ' – ' || to_char(week_start + interval '6 days','DD Mon YYYY'),
       week_start::date,(week_start + interval '6 days')::date
FROM generate_series(DATE '2024-01-01',DATE '2029-12-31',interval '7 days') AS week_start
ON CONFLICT DO NOTHING;

INSERT INTO sababuka.schema_migrations (version,description)
VALUES ('037','frequency-aware annual, semester, quarter, monthly, and weekly reporting')
ON CONFLICT (version) DO NOTHING;

COMMIT;
