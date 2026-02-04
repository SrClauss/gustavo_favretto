// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod db;
pub mod models;

use crate::db::{create_extrator, init_db, list_extratores};
use serde_json::Value;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn cawabunga() -> String {
    "cawabunga".to_string()
}

#[tauri::command]
fn soma(a: i32, b: i32) -> i32 {
    a + b
}

#[tauri::command]
fn init_database(path: Option<String>) -> Result<String, String> {
    init_db(path.as_deref())
        .map(|_| "OK".to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_extratores_cmd() -> Result<Value, String> {
    list_extratores()
        .map(|v| serde_json::to_value(v).unwrap_or(Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_extrator_cmd(data: Value) -> Result<Value, String> {
    create_extrator(data)
        .map(|v| serde_json::to_value(v).unwrap_or(Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn import_json_cmd(tree: String, file_path: String) -> Result<usize, String> {
    crate::db::import_json_to_tree(&tree, &file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_parada_cmd(data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::create_parada(data)
        .map(|v| v)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_parada_cmd(id: String, data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::update_parada(&id, data)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_parada_cmd(id: String) -> Result<String, String> {
    crate::db::delete_parada(&id)
        .map(|_| "OK".to_string())
        .map_err(|e| e.to_string())
}

// ===== Paradas batch & filters
#[tauri::command]
fn batch_create_paradas_cmd(data: serde_json::Value) -> Result<serde_json::Value, String> {
    let arr = data
        .as_array()
        .ok_or_else(|| "payload deve ser um array".to_string())?
        .clone();
    crate::db::batch_create_paradas(arr)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_paradas_cmd_filter(
    data: Option<String>,
    extrator_id: Option<String>,
) -> Result<serde_json::Value, String> {
    crate::db::list_paradas_filtered(data.as_deref(), extrator_id.as_deref())
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

// ===== Horimetro commands
#[tauri::command]
fn get_horimetro_status_cmd(
    extrator_id: String,
    data: String,
) -> Result<serde_json::Value, String> {
    crate::db::get_horimetro_status(&extrator_id, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_ultimo_horimetro_cmd(extrator_id: String) -> Result<serde_json::Value, String> {
    crate::db::get_ultimo_horimetro(&extrator_id)
        .map(|o| serde_json::to_value(o).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn upsert_horimetro_cmd(data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::upsert_horimetro(data).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_horimetros_by_date_cmd(data: String) -> Result<serde_json::Value, String> {
    crate::db::list_horimetros(None, Some(&data))
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pode_processar_cmd(extrator_id: String, data: String) -> Result<serde_json::Value, String> {
    crate::db::pode_processar(&extrator_id, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn processar_dia_cmd(extrator_id: String, data: String) -> Result<serde_json::Value, String> {
    crate::db::processar_dia(&extrator_id, &data).map_err(|e| e.to_string())
}

// ===== Cadastros: motivos / locais
#[tauri::command]
fn list_motivos_cmd(
    search: Option<String>,
    apenas_ativos: Option<bool>,
) -> Result<serde_json::Value, String> {
    let ativos = apenas_ativos.unwrap_or(true);
    crate::db::list_motivos(search.as_deref(), ativos)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_motivo_cmd(data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::create_motivo(data)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_motivo_cmd(id: String, data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::update_motivo(&id, data)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_motivo_cmd(id: String) -> Result<String, String> {
    crate::db::delete_motivo(&id)
        .map(|_| "OK".to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_locais_cmd(
    search: Option<String>,
    apenas_ativos: Option<bool>,
) -> Result<serde_json::Value, String> {
    let ativos = apenas_ativos.unwrap_or(true);
    crate::db::list_locais(search.as_deref(), ativos)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn create_local_cmd(data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::create_local(data)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_local_cmd(id: String, data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::update_local(&id, data)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_local_cmd(id: String) -> Result<String, String> {
    crate::db::delete_local(&id)
        .map(|_| "OK".to_string())
        .map_err(|e| e.to_string())
}

// ===== Feedback produção
#[tauri::command]
fn create_feedback_cmd(data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::create_feedback(data)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn list_feedbacks_cmd(data: Option<String>) -> Result<serde_json::Value, String> {
    crate::db::list_feedbacks(data.as_deref())
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn update_feedback_cmd(id: String, data: serde_json::Value) -> Result<serde_json::Value, String> {
    crate::db::update_feedback(&id, data)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_feedback_cmd(id: String) -> Result<String, String> {
    crate::db::delete_feedback(&id)
        .map(|_| "OK".to_string())
        .map_err(|e| e.to_string())
}

// ===== Dashboard commands
#[tauri::command]
fn get_nominal_constant_cmd() -> Result<f64, String> {
    Ok(crate::db::get_nominal_constant())
}

#[tauri::command]
fn calculate_nominal_cmd(
    tamanho_fruta: f64,
    caixas_produto: i32,
    total_caixas: i32,
) -> Result<f64, String> {
    Ok(crate::db::calculate_nominal(
        tamanho_fruta,
        caixas_produto,
        total_caixas,
    ))
}

#[tauri::command]
fn get_dashboard_stats_cmd(periodo: String, data_ref: String) -> Result<serde_json::Value, String> {
    crate::db::get_dashboard_stats(&periodo, &data_ref).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_timeline_paradas_cmd(data: String) -> Result<serde_json::Value, String> {
    // reuse the dashboard timeline logic: here we just return events
    crate::db::get_timeline_paradas(&data)
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_oee_stats_cmd(
    periodo: String,
    data_ref: Option<String>,
    extrator_id: Option<String>,
) -> Result<serde_json::Value, String> {
    crate::db::get_oee_stats(&periodo, data_ref.as_deref(), extrator_id.as_deref())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Initialize DB during app startup; try default path then fallback to a temporary DB if needed.
        .setup(|_app| {
            match init_db(None) {
                Ok(_) => println!("DB inicializado com sucesso"),
                Err(e) => {
                    eprintln!("Falha ao inicializar DB no caminho padrão: {}", e);
                    eprintln!("Tentando inicializar DB temporário...");
                    if let Err(e2) = crate::db::init_db_temporary() {
                        eprintln!("Falha ao inicializar DB temporário: {}", e2);
                    } else {
                        println!("DB temporário inicializado.");
                    }
                }
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            cawabunga,
            soma,
            init_database,
            list_extratores_cmd,
            create_extrator_cmd,
            import_json_cmd,
            // paradas
            list_paradas_cmd_filter,
            batch_create_paradas_cmd,
            create_parada_cmd,
            update_parada_cmd,
            delete_parada_cmd,
            // cadastros
            list_motivos_cmd,
            create_motivo_cmd,
            update_motivo_cmd,
            delete_motivo_cmd,
            list_locais_cmd,
            create_local_cmd,
            update_local_cmd,
            delete_local_cmd,
            // feedbacks
            create_feedback_cmd,
            list_feedbacks_cmd,
            update_feedback_cmd,
            delete_feedback_cmd,
            // horimetro
            get_horimetro_status_cmd,
            get_ultimo_horimetro_cmd,
            upsert_horimetro_cmd,
            list_horimetros_by_date_cmd,
            pode_processar_cmd,
            processar_dia_cmd,
            // dashboard
            get_nominal_constant_cmd,
            calculate_nominal_cmd,
            get_dashboard_stats_cmd,
            get_timeline_paradas_cmd,
            get_oee_stats_cmd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod db_tests;