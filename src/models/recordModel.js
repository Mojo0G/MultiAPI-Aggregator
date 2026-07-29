const pool = require('../config/db');

const recordModel = {
  saveRecord: async (item) => {
    const query = `
      INSERT INTO aggregated_records (id, title, url, source, score, fetched_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        url = EXCLUDED.url,
        score = EXCLUDED.score,
        fetched_at = EXCLUDED.fetched_at,
        metadata = EXCLUDED.metadata
      RETURNING *;
    `;

    const values = [
      item.id,
      item.title,
      item.url,
      item.source,
      item.score || 0,
      item.fetched_at || new Date(),
      JSON.stringify(item.metadata || {})
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  saveManyRecords: async (records) => {
    const savedItems = [];
    for (const record of records) {
      const saved = await recordModel.saveRecord(record);
      savedItems.push(saved);
    }
    return savedItems;
  },

  getTrending: async (source = null, limit = 50) => {
    if (source) {
      const query = `
        SELECT id, title, url, source, score, fetched_at, metadata FROM aggregated_records 
        WHERE LOWER(source) = LOWER($1) 
        ORDER BY score DESC, fetched_at DESC 
        LIMIT $2
      `;
      const result = await pool.query(query, [source, limit]);
      return result.rows;
    } else {
      // Fair Interleaved Aggregation across all sources using Window Functions
      const query = `
        WITH ranked_records AS (
          SELECT *, ROW_NUMBER() OVER (PARTITION BY source ORDER BY score DESC, fetched_at DESC) as rnk
          FROM aggregated_records
        )
        SELECT id, title, url, source, score, fetched_at, metadata
        FROM ranked_records
        ORDER BY rnk ASC, score DESC
        LIMIT $1
      `;
      const result = await pool.query(query, [limit]);
      return result.rows;
    }
  }
};

module.exports = recordModel;
