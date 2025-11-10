CREATE KEYSPACE IF NOT EXISTS greendata
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Tabla de lecturas optimizada por dia y tipo de sensor
CREATE TABLE IF NOT EXISTS greendata.readings (
  plant_id    text,
  sensor_type text,   -- 'humidity'|'ph'|'temp'|'lux'
  ymd         date,    -- particion por dia
  ts          timestamp,  -- clustering
  sensor_id   text,
  value       double,
  PRIMARY KEY ((plant_id, sensor_type, ymd), ts, sensor_id)
) WITH CLUSTERING ORDER BY (ts DESC);

-- Agregados diarios (min/avg/max/count) por planta/sensor/dia
CREATE TABLE IF NOT EXISTS greendata.readings_daily (
  plant_id    text,
  sensor_type text,
  ymd         date,
  min         double,
  avg         double,
  max         double,
  count       bigint,
  PRIMARY KEY ((plant_id, sensor_type), ymd)
);

