CREATE KEYSPACE IF NOT EXISTS greendata
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Tabla de lecturas optimizada por día y tipo de sensor
CREATE TABLE IF NOT EXISTS greendata.readings (
  plant_id   text,
  sensor_type text,   -- 'humidity'|'ph'|'temp'|'lux'
  ymd        date,    -- partición por día
  ts         timestamp,  -- clustering
  sensor_id  text,
  value      double,
  PRIMARY KEY ((plant_id, sensor_type, ymd), ts, sensor_id)
) WITH CLUSTERING ORDER BY (ts DESC);
