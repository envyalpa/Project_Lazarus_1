import db from './db.js';

export function getBrands(clientId) {
  return db.prepare('SELECT * FROM brand_profiles WHERE client_id = ? ORDER BY profile_name ASC').all(clientId);
}

export function getBrandById(brandId) {
  return db.prepare('SELECT * FROM brand_profiles WHERE id = ?').get(brandId);
}

export function saveBrand(brand) {
  const { id, client_id, profile_name, logo_data_uri, colors_json, typography_json, layout_json, is_default } = brand;
  
  db.transaction(() => {
    // If setting as default, unset others first
    if (is_default) {
      db.prepare('UPDATE brand_profiles SET is_default = 0 WHERE client_id = ?').run(client_id);
    }
    
    if (id) {
      db.prepare(`
        UPDATE brand_profiles 
        SET profile_name = ?, logo_data_uri = ?, colors_json = ?, typography_json = ?, layout_json = ?, is_default = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(profile_name, logo_data_uri, colors_json, typography_json, layout_json, is_default ? 1 : 0, id);
    } else {
      db.prepare(`
        INSERT INTO brand_profiles (client_id, profile_name, logo_data_uri, colors_json, typography_json, layout_json, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(client_id, profile_name, logo_data_uri, colors_json, typography_json, layout_json, is_default ? 1 : 0);
    }
  })();
}

export function deleteBrand(brandId) {
  db.prepare('DELETE FROM brand_profiles WHERE id = ?').run(brandId);
}
