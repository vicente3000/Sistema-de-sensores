@'
CREATE KEYSPACE IF NOT EXISTS greendata
  WITH replication = {'class':'SimpleStrategy','replication_factor':1};

CREATE TABLE IF NOT EXISTS greendata.readings (
  plant_id  text,
  sensor_id text,
  ts        timestamp,
  value     double,
  PRIMARY KEY ((plant_id, sensor_id), ts)
) WITH CLUSTERING ORDER BY (ts DESC);
'@ | Out-File -FilePath .\cassandra\init.cql -Encoding utf8 -NoNewline