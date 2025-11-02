
CREATE KEYSPACE IF NOT EXISTS greendata
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

CREATE TABLE IF NOT EXISTS greendata.planta (
    id TEXT PRIMARY KEY,
    nombre TEXT,
    especie TEXT,
    ubicacion TEXT
);

CREATE TABLE IF NOT EXISTS greendata.sensor (
    idPlanta TEXT,
    id TEXT,
    tipo TEXT,
    intervalo INT,
    PRIMARY KEY (idPlanta, id)
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
    idPlanta TEXT,
    id TEXT,
    tipo TEXT,
    fecha TIMESTAMP,
    estado TEXT,
    PRIMARY KEY (idPlanta, id)
);

CREATE INDEX IF NOT EXISTS ON greendata.lectura (alerta);

