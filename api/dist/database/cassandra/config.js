import { Client } from 'cassandra-driver';
let cassandraClient = null;
export const initCassandra = async () => {
    try {
        if (cassandraClient)
            return cassandraClient;
        const contactPoints = (process.env.CASSANDRA_CONTACT_POINTS ?? 'cassandra')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        const localDataCenter = process.env.CASSANDRA_DATACENTER || process.env.CASSANDRA_DC || 'dc1';
        const keyspace = process.env.CASSANDRA_KEYSPACE || 'greendata';
        const client = new Client({
            contactPoints,
            localDataCenter,
            keyspace,
        });
        await client.connect();
        console.log(`✅ Cassandra conectada (DC=${localDataCenter}, KP=${keyspace})`);
        cassandraClient = client;
        return cassandraClient;
    }
    catch (err) {
        console.error('❌ Error al iniciar Cassandra:', err);
        throw err;
    }
};
export const getCassandra = () => cassandraClient;
