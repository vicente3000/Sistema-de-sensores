-- api/src/database/cassandra/init.cql
CREATE KEYSPACE IF NOT EXISTS greendata
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

CREATE TABLE IF NOT EXISTS greendata.planta (
    id TEXT PRIMARY KEY,
    nombre TEXT,
    especie TEXT,
    ubicacion TEXT
);

CREATE TABLE IF NOT EXISTS greendata.sensor (
    id TEXT PRIMARY KEY,
    idPlanta TEXT,
    tipo TEXT,
    intervalo INT
);

CREATE TABLE IF NOT EXISTS greendata.lectura (
    id TEXT,
    idSensor TEXT,
    fecha TIMESTAMP,
    valor FLOAT,
    alerta TEXT,
    PRIMARY KEY ((idSensor), fecha, id)
) WITH CLUSTERING ORDER BY (fecha DESC);

CREATE TABLE IF NOT EXISTS greendata.accion (
    id TEXT PRIMARY KEY,
    idPlanta TEXT,
    tipo TEXT,
    fecha TIMESTAMP,
    estado TEXT
);

CREATE INDEX IF NOT EXISTS ON greendata.sensor (idPlanta);
CREATE INDEX IF NOT EXISTS ON greendata.lectura (alerta);
CREATE INDEX IF NOT EXISTS ON greendata.accion (idPlanta);
