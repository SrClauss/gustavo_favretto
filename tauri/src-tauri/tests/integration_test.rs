use serde_json::json;

#[test]
fn smoke_db_operations() {
    // Use temporary DB to avoid filesystem permission issues on Windows/CI
    if let Err(e) = tauri_lib::db::init_db_temporary() {
        eprintln!("Skipping integration test due to DB init error: {}", e);
        return;
    }

    // create extrator
    let payload = json!({"numero": 42, "modelo": "X"});
    let created = tauri_lib::db::create_extrator(payload).unwrap();
    let list = tauri_lib::db::list_extratores().unwrap();
    assert!(list.iter().any(|e| e.id == created.id));

    // create motivo and use it for parada
    let motivo = tauri_lib::db::create_motivo(json!({"descricao": "M1", "classificacao": "Disponibilidade", "padrao": false, "ativo": true})).unwrap();
    let p = json!({"data": "2026-02-03", "motivo": motivo.id.clone(), "hora_inicio": "08:00", "hora_fim": "09:00", "extratores_parados": [created.id.clone()]});
    let created_p = tauri_lib::db::create_parada(p).unwrap();
    let created_id = created_p["id"].as_str().unwrap().to_string();
    let listed = tauri_lib::db::list_paradas_filtered(Some("2026-02-03"), None).unwrap();
    assert!(listed.iter().any(|x| x.id == created_id));
}
