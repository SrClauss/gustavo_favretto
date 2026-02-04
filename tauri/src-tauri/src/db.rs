use anyhow::Result;
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use serde_json::Value;
use sled::Db;
use std::path::PathBuf;
use uuid::Uuid;

static DB_INSTANCE: OnceCell<Mutex<Db>> = OnceCell::new();

pub fn init_db(path: Option<&str>) -> Result<()> {
    // If DB already initialized, return OK (idempotent init for tests/runtime)
    if DB_INSTANCE.get().is_some() {
        return Ok(());
    }
    let db_path = match path {
        Some(p) => PathBuf::from(p),
        None => {
            // Use project root 'data' folder. If running under 'src-tauri' (dev), go up one level.
            let mut p = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
            if p.ends_with("src-tauri") {
                p.pop();
            }
            p.push("data");
            p.push("sled_db");
            p
        }
    };
    
    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    
    // Open with optimized config (sled 0.34.7 API)
    let db = sled::Config::default()
        .path(&db_path)
        .cache_capacity(64 * 1024 * 1024)
        .mode(sled::Mode::HighThroughput)
        .open()?;
    
    match DB_INSTANCE.set(Mutex::new(db)) {
        Ok(_) => (),
        Err(_) => (), // already set by concurrent test - ignore
    };
    
    println!("DB inicializado com sucesso em: {:?}", db_path);
    Ok(())
}

/// Initialize a temporary DB in a unique temp directory (for tests or ephemeral use).
pub fn init_db_temporary() -> Result<()> {
    // If DB already initialized, return OK (idempotent for tests)
    if DB_INSTANCE.get().is_some() {
        return Ok(());
    }
    // sled 0.34.7 supports .temporary(true) for in-memory DB
    let db = sled::Config::default()
        .temporary(true)
        .open()?;
    
    match DB_INSTANCE.set(Mutex::new(db)) {
        Ok(_) => (),
        Err(_) => (), // already set by concurrent test - ignore
    };
    
    println!("DB temporário inicializado (in-memory)");
    Ok(())
}

fn open_tree(tree_name: &str) -> Result<sled::Tree> {
    if let Some(m) = DB_INSTANCE.get() {
        Ok(m.lock().open_tree(tree_name)?)
    } else {
        anyhow::bail!("DB não inicializado")
    }
}

pub fn list_extratores() -> Result<Vec<Extrator>> {
    let tree = match open_tree("extratores") {
        Ok(t) => t,
        Err(_) => return Ok(vec![]),
    };
    let mut v = Vec::new();
    for item in tree.iter() {
        let kv = item?;
        let val = kv.1;
        let extr: Extrator = serde_json::from_slice(&val)?;
        v.push(extr);
    }
    Ok(v)
}

pub fn create_extrator(mut data: Value) -> Result<Extrator> {
    let id = Uuid::new_v4().to_string();
    data["id"] = Value::String(id.clone());
    // Ensure default ativo=true if not provided
    if data.get("ativo").is_none() {
        data["ativo"] = Value::Bool(true);
    }
    let extr: Extrator = serde_json::from_value(data)?;
    let tree = open_tree("extratores")?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&extr)?)?;
    tree.flush()?;
    Ok(extr)
}

pub fn get_extrator(id: &str) -> Result<Option<Extrator>> {
    let tree = open_tree("extratores")?;
    if let Some(v) = tree.get(id.as_bytes())? {
        let extr: Extrator = serde_json::from_slice(&v)?;
        Ok(Some(extr))
    } else {
        Ok(None)
    }
}

pub fn import_json_to_tree(tree_name: &str, file_path: &str) -> Result<usize> {
    let contents = std::fs::read_to_string(file_path)?;
    let arr: serde_json::Value = serde_json::from_str(&contents)?;
    let items = arr
        .as_array()
        .ok_or_else(|| anyhow::anyhow!("JSON não é um array"))?;
    let tree = open_tree(tree_name)?;
    let mut count = 0usize;
    for v in items {
        if let Some(id) = v.get("id").and_then(|x| x.as_str()) {
            tree.insert(id.as_bytes(), serde_json::to_vec(v)?)?;
            count += 1;
        }
    }
    tree.flush()?;
    Ok(count)
}

// ===== Paradas CRUD básico =====
use crate::models::{Extrator, FeedBackProducao, Horimetro, LocalParada, MotivosParada, Parada};
use chrono::{NaiveDate, Utc};

pub fn list_paradas_filtered(
    data_opt: Option<&str>,
    extrator_id_opt: Option<&str>,
) -> Result<Vec<Parada>> {
    let tree = match open_tree("paradas") {
        Ok(t) => t,
        Err(_) => return Ok(vec![]),
    };
    let mut v = Vec::new();
    for item in tree.iter() {
        let kv = item?;
        let val = kv.1;
        let p: Parada = serde_json::from_slice(&val)?;
        if !p.ativo {
            continue;
        }
        if let Some(ds) = data_opt {
            let d = NaiveDate::parse_from_str(ds, "%Y-%m-%d")?;
            if p.data != d {
                continue;
            }
        }
        if let Some(eid) = extrator_id_opt {
            if !p.extratores_parados.iter().any(|x| x == eid) {
                continue;
            }
        }
        v.push(p);
    }
    Ok(v)
}

fn parse_time(s: &str) -> Option<i32> {
    // Expect format HH:MM (24h). Returns minutes since midnight.
    let parts: Vec<&str> = s.split(':').collect();
    if parts.len() != 2 {
        return None;
    }
    let hh = parts[0].parse::<i32>().ok()?;
    let mm = parts[1].parse::<i32>().ok()?;
    if hh < 0 || hh > 23 || mm < 0 || mm > 59 {
        return None;
    }
    Some(hh * 60 + mm)
}

pub fn batch_create_paradas(paradas: Vec<serde_json::Value>) -> Result<Vec<serde_json::Value>> {
    let mut res = Vec::new();
    for p in paradas {
        res.push(create_parada(p)?);
    }
    Ok(res)
}

pub fn create_parada(mut data: serde_json::Value) -> Result<serde_json::Value> {
    let id = Uuid::new_v4().to_string();
    data["id"] = serde_json::Value::String(id.clone());
    // Ensure defaults
    if data.get("extratores_parados").is_none() {
        data["extratores_parados"] = serde_json::Value::Array(vec![]);
    }
    if data.get("ativo").is_none() {
        data["ativo"] = serde_json::Value::Bool(true);
    }

    // Validate time fields before persisting
    let h_inicio = data
        .get("hora_inicio")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let h_fim = data.get("hora_fim").and_then(|v| v.as_str()).unwrap_or("");

    // basic presence check already done by caller; validate format
    if parse_time(h_inicio).is_none() {
        return Ok(serde_json::json!({
            "error": "validation",
            "field": "hora_inicio",
            "message": "Hora início inválida (formato esperado HH:MM)",
            "hint": "Use formato 24h 'HH:MM' (ex: 08:00)."
        }));
    }
    if parse_time(h_fim).is_none() {
        return Ok(serde_json::json!({
            "error": "validation",
            "field": "hora_fim",
            "message": "Hora fim inválida (formato esperado HH:MM)",
            "hint": "Use formato 24h 'HH:MM' (ex: 09:30)."
        }));
    }

    let inicio_min = parse_time(h_inicio).unwrap();
    let fim_min = parse_time(h_fim).unwrap();
    if fim_min <= inicio_min {
        return Ok(serde_json::json!({
            "error": "validation",
            "field": "hora_fim",
            "message": "Hora fim deve ser maior que a hora de início",
            "hint": "Verifique os horários informados — fim deve ser posterior ao início."
        }));
    }

    let parada: Parada = serde_json::from_value(data)?;
    let tree = open_tree("paradas")?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&parada)?)?;
    tree.flush()?;
    Ok(serde_json::to_value(&parada)?)
}

pub fn update_parada(id: &str, data: serde_json::Value) -> Result<Parada> {
    let tree = open_tree("paradas")?;
    if tree.get(id.as_bytes())?.is_none() {
        anyhow::bail!("Parada não encontrada");
    }
    let mut obj = serde_json::from_slice::<serde_json::Value>(&tree.get(id.as_bytes())?.unwrap())?;
    merge_json(&mut obj, &data);
    let parada: Parada = serde_json::from_value(obj.clone())?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&parada)?)?;
    tree.flush()?;
    Ok(parada)
}

pub fn delete_parada(id: &str) -> Result<()> {
    let tree = open_tree("paradas")?;
    if let Some(v) = tree.get(id.as_bytes())? {
        let mut obj = serde_json::from_slice::<serde_json::Value>(&v)?;
        obj["ativo"] = serde_json::Value::Bool(false);
        tree.insert(id.as_bytes(), serde_json::to_vec(&obj)?)?;
        tree.flush()?;
    }
    Ok(())
}

fn merge_json(a: &mut serde_json::Value, b: &serde_json::Value) {
    match (a, b) {
        (serde_json::Value::Object(map_a), serde_json::Value::Object(map_b)) => {
            for (k, v) in map_b {
                merge_json(map_a.entry(k).or_insert(serde_json::Value::Null), v);
            }
        }
        (x, y) => {
            *x = y.clone();
        }
    }
}

// ===== Cadastros: Motivos e Locais =====

pub fn list_motivos(search: Option<&str>, apenas_ativos: bool) -> Result<Vec<MotivosParada>> {
    let tree = match open_tree("motivos_parada") {
        Ok(t) => t,
        Err(_) => return Ok(vec![]),
    };
    let mut v = Vec::new();
    for item in tree.iter() {
        let kv = item?;
        let m: MotivosParada = serde_json::from_slice(&kv.1)?;
        if apenas_ativos && !m.ativo {
            continue;
        }
        if let Some(s) = search {
            if !m.descricao.to_lowercase().contains(&s.to_lowercase()) {
                continue;
            }
        }
        v.push(m);
    }
    Ok(v)
}

pub fn create_motivo(mut data: serde_json::Value) -> Result<MotivosParada> {
    let id = Uuid::new_v4().to_string();
    data["id"] = serde_json::Value::String(id.clone());
    if data.get("ativo").is_none() {
        data["ativo"] = serde_json::Value::Bool(true);
    }
    let m: MotivosParada = serde_json::from_value(data)?;
    let tree = open_tree("motivos_parada")?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&m)?)?;
    tree.flush()?;
    Ok(m)
} 

pub fn update_motivo(id: &str, data: serde_json::Value) -> Result<MotivosParada> {
    let tree = open_tree("motivos_parada")?;
    if tree.get(id.as_bytes())?.is_none() {
        anyhow::bail!("Motivo não encontrado");
    }
    let mut obj = serde_json::from_slice::<serde_json::Value>(&tree.get(id.as_bytes())?.unwrap())?;
    merge_json(&mut obj, &data);
    let m: MotivosParada = serde_json::from_value(obj.clone())?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&m)?)?;
    tree.flush()?;
    Ok(m)
} 

pub fn delete_motivo(id: &str) -> Result<()> {
    let tree = open_tree("motivos_parada")?;
    tree.remove(id.as_bytes())?;
    tree.flush()?;
    Ok(())
}

pub fn list_locais(search: Option<&str>, apenas_ativos: bool) -> Result<Vec<LocalParada>> {
    let tree = match open_tree("local_parada") {
        Ok(t) => t,
        Err(_) => return Ok(vec![]),
    };
    let mut v = Vec::new();
    for item in tree.iter() {
        let kv = item?;
        let m: LocalParada = serde_json::from_slice(&kv.1)?;
        if apenas_ativos && !m.ativo {
            continue;
        }
        if let Some(s) = search {
            if !m.descricao.to_lowercase().contains(&s.to_lowercase()) {
                continue;
            }
        }
        v.push(m);
    }
    Ok(v)
}

pub fn create_local(mut data: serde_json::Value) -> Result<LocalParada> {
    let id = Uuid::new_v4().to_string();
    data["id"] = serde_json::Value::String(id.clone());
    if data.get("ativo").is_none() {
        data["ativo"] = serde_json::Value::Bool(true);
    }
    let m: LocalParada = serde_json::from_value(data)?;
    let tree = open_tree("local_parada")?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&m)?)?;
    tree.flush()?;
    Ok(m)
} 

pub fn update_local(id: &str, data: serde_json::Value) -> Result<LocalParada> {
    let tree = open_tree("motivos_parada")?;
    if tree.get(id.as_bytes())?.is_none() {
        anyhow::bail!("Local não encontrado");
    }
    let mut obj = serde_json::from_slice::<serde_json::Value>(&tree.get(id.as_bytes())?.unwrap())?;
    merge_json(&mut obj, &data);
    let m: LocalParada = serde_json::from_value(obj.clone())?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&m)?)?;
    tree.flush()?;
    Ok(m)
}

pub fn delete_local(id: &str) -> Result<()> {
    let tree = open_tree("local_parada")?;
    tree.remove(id.as_bytes())?;
    tree.flush()?;
    Ok(())
}

// ===== Feedback produção =====

pub fn create_feedback(mut data: serde_json::Value) -> Result<FeedBackProducao> {
    let id = Uuid::new_v4().to_string();
    data["id"] = serde_json::Value::String(id.clone());
    let f: FeedBackProducao = serde_json::from_value(data)?;
    let tree = open_tree("feedback_producao")?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&f)?)?;
    tree.flush()?;
    Ok(f)
}

pub fn list_feedbacks(data_opt: Option<&str>) -> Result<Vec<FeedBackProducao>> {
    let tree = match open_tree("feedback_producao") {
        Ok(t) => t,
        Err(_) => return Ok(vec![]),
    };
    let mut v = Vec::new();
    for item in tree.iter() {
        let kv = item?;
        let f: FeedBackProducao = serde_json::from_slice(&kv.1)?;
        if let Some(ds) = data_opt {
            let d = NaiveDate::parse_from_str(ds, "%Y-%m-%d")?;
            if f.data != d {
                continue;
            }
        }
        v.push(f);
    }
    Ok(v)
}

pub fn update_feedback(id: &str, data: serde_json::Value) -> Result<FeedBackProducao> {
    let tree = open_tree("feedback_producao")?;
    if tree.get(id.as_bytes())?.is_none() {
        anyhow::bail!("Feedback não encontrado");
    }
    let mut obj = serde_json::from_slice::<serde_json::Value>(&tree.get(id.as_bytes())?.unwrap())?;
    merge_json(&mut obj, &data);
    let f: FeedBackProducao = serde_json::from_value(obj.clone())?;
    tree.insert(id.as_bytes(), serde_json::to_vec(&f)?)?;
    tree.flush()?;
    Ok(f)
}

pub fn delete_feedback(id: &str) -> Result<()> {
    let tree = open_tree("feedback_producao")?;
    tree.remove(id.as_bytes())?;
    tree.flush()?;
    Ok(())
}

// ===== Dashboard functions =====

pub fn get_nominal_constant() -> f64 {
    110.909090909091
}

pub fn calculate_nominal(tamanho_fruta: f64, caixas_produto: i32, total_caixas: i32) -> f64 {
    if tamanho_fruta <= 0.0 || total_caixas <= 0 {
        return 0.0;
    }
    let nominal_base = get_nominal_constant();
    let multiplicador = 5.0 * 60.0 * 11.0 * 24.0;
    let nominal_total = (nominal_base * multiplicador) / tamanho_fruta;
    let nominal_produto = nominal_total * (caixas_produto as f64 / total_caixas as f64);
    (nominal_produto * 100.0).round() / 100.0
}

pub fn get_dashboard_stats(periodo: &str, data_ref: &str) -> Result<serde_json::Value> {
    // Simple translation of the Python logic
    let feedbacks = list_feedbacks(Some(data_ref))?;
    let total_caixas: i32 = feedbacks.iter().map(|f| f.caixas_processadas).sum();
    let mut capacidade_nominal = 0.0;
    if !feedbacks.is_empty() {
        for f in &feedbacks {
            capacidade_nominal += calculate_nominal(
                f.tamanho_da_fruta,
                f.caixas_processadas,
                if total_caixas > 0 { total_caixas } else { 1 },
            );
        }
    }
    let eficiencia_nominal = if capacidade_nominal > 0.0 {
        (total_caixas as f64 / capacidade_nominal) * 100.0
    } else {
        0.0
    };

    // status extratores
    let extratores = list_extratores()?;
    let mut status_extratores: Vec<serde_json::Value> = Vec::new();
    for e in extratores {
        let paradas = list_paradas_filtered(Some(data_ref), Some(&e.id))?;
        let parada_aberta = paradas.iter().find(|p| p.ativo).cloned();
        let status = if parada_aberta.is_some() {
            "Parado"
        } else {
            "Rodando"
        };
        let motivo_parada = parada_aberta.map(|p| p.motivo.clone());
        status_extratores.push(serde_json::json!({"id": e.id, "numero": e.numero, "modelo": e.modelo, "status": status, "motivo_parada": motivo_parada}));
    }

    // top motivos
    let paradas_periodo = list_paradas_filtered(Some(data_ref), None)?;
    use std::collections::HashMap;
    let mut count_map: HashMap<String, i32> = HashMap::new();
    for p in &paradas_periodo {
        *count_map.entry(p.motivo.clone()).or_insert(0) += 1;
    }
    let mut counts: Vec<(String, i32)> = count_map.into_iter().collect();
    counts.sort_by(|a, b| b.1.cmp(&a.1));
    let mut top_motivos = Vec::new();
    for (motivo_id, quantidade) in counts.into_iter().take(5) {
        let motivo_tree = open_tree("motivos_parada")?;
        let motivo = motivo_tree.get(motivo_id.as_bytes())?;
        let descricao = if let Some(val) = motivo {
            let m: MotivosParada = serde_json::from_slice(&val)?;
            m.descricao
        } else {
            "Desconhecido".to_string()
        };
        // tempo total
        let mut tempo_total = 0.0;
        for p in &paradas_periodo {
            if p.motivo == motivo_id {
                if let Ok(inicio) = chrono::NaiveTime::parse_from_str(&p.hora_inicio, "%H:%M") {
                    if let Ok(fim) = chrono::NaiveTime::parse_from_str(&p.hora_fim, "%H:%M") {
                        let dur = (fim - inicio).num_minutes() as f64;
                        tempo_total += dur;
                    }
                }
            }
        }
        top_motivos.push(serde_json::json!({"motivo": descricao, "quantidade": quantidade, "tempo_total_minutos": (tempo_total*100.0).round()/100.0}));
    }

    // horas trabalhadas e paradas
    let horimetros_list = list_horimetros(None, Some(data_ref))?;
    let horas_trabalhadas: f64 = horimetros_list
        .iter()
        .map(|h| h.get("valor").and_then(|v| v.as_f64()).unwrap_or(0.0))
        .sum();

    let minutos_parados: f64 = paradas_periodo
        .iter()
        .map(|p| {
            if let (Ok(inicio), Ok(fim)) = (
                chrono::NaiveTime::parse_from_str(&p.hora_inicio, "%H:%M"),
                chrono::NaiveTime::parse_from_str(&p.hora_fim, "%H:%M"),
            ) {
                (fim - inicio).num_minutes() as f64
            } else {
                0.0
            }
        })
        .sum();
    let horas_paradas = minutos_parados / 60.0;
    let tempo_total = horas_trabalhadas + horas_paradas;
    let disponibilidade = if tempo_total > 0.0 {
        (horas_trabalhadas / tempo_total) * 100.0
    } else {
        0.0
    };

    Ok(serde_json::json!({
        "periodo": periodo,
        "data_inicio": data_ref,
        "data_fim": data_ref,
        "summary": {
            "total_caixas": total_caixas,
            "capacidade_nominal": (capacidade_nominal*100.0).round()/100.0,
            "eficiencia_nominal": (eficiencia_nominal*100.0).round()/100.0/100.0,
            "horas_trabalhadas": (horas_trabalhadas*100.0).round()/100.0,
            "horas_paradas": (horas_paradas*100.0).round()/100.0,
            "minutos_parados": (minutos_parados*100.0).round()/100.0,
            "disponibilidade": (disponibilidade*100.0).round()/100.0/100.0
        },
        "status_extratores": status_extratores,
        "top_motivos_parada": top_motivos
    }))
}

pub fn get_timeline_paradas(data: &str) -> Result<Vec<serde_json::Value>> {
    let _date = NaiveDate::parse_from_str(data, "%Y-%m-%d")?;
    let paradas = list_paradas_filtered(Some(data), None)?;
    let mut eventos = Vec::new();
    for p in paradas {
        for extr_id in p.extratores_parados {
            // find extrator
            let extr = open_tree("extratores")?.get(extr_id.as_bytes())?;
            let (extr_id_val, extr_numero) = if let Some(v) = extr {
                let e: Extrator = serde_json::from_slice(&v)?;
                (Some(e.id), e.numero)
            } else {
                (Some(extr_id.clone()), 0)
            };
            let motivo_tree = open_tree("motivos_parada")?;
            let motivo = motivo_tree
                .get(p.motivo.as_bytes())?
                .and_then(|v| serde_json::from_slice::<MotivosParada>(&v).ok())
                .map(|m| (m.descricao, m.classificacao));
            let local_tree = open_tree("local_parada")?;
            let local = p
                .local_parada
                .as_ref()
                .and_then(|lid| local_tree.get(lid.as_bytes()).ok().flatten())
                .and_then(|v| serde_json::from_slice::<LocalParada>(&v).ok())
                .map(|l| l.descricao);
            eventos.push(serde_json::json!({
                "extrator_id": extr_id_val,
                "extrator_numero": extr_numero,
                "inicio": p.hora_inicio,
                "fim": p.hora_fim,
                "motivo": motivo.as_ref().map(|m| m.0.clone()).unwrap_or("Desconhecido".to_string()),
                "classificacao": motivo.as_ref().and_then(|m| m.1.clone()),
                "local": local,
                "observacoes": p.observacoes
            }));
        }
    }
    Ok(eventos)
}

pub fn get_oee_stats(
    periodo: &str,
    data_ref: Option<&str>,
    extrator_id: Option<&str>,
) -> Result<serde_json::Value> {
    let data = data_ref
        .unwrap_or(&chrono::Local::now().format("%Y-%m-%d").to_string())
        .to_string();
    let horimetros_vals = list_horimetros(extrator_id, Some(&data))?;
    let tempo_planejado = (horimetros_vals.len() as f64) * 8.0;
    let tempo_operacional: f64 = horimetros_vals
        .iter()
        .map(|h| h.get("valor").and_then(|v| v.as_f64()).unwrap_or(0.0))
        .sum();
    let disponibilidade = if tempo_planejado > 0.0 {
        (tempo_operacional / tempo_planejado) * 100.0
    } else {
        0.0
    };
    let performance = 100.0;
    let qualidade = 100.0;
    let oee = (disponibilidade / 100.0) * (performance / 100.0) * (qualidade / 100.0) * 100.0;
    Ok(serde_json::json!({
        "periodo": periodo,
        "data_inicio": data,
        "data_fim": data,
        "disponibilidade": (disponibilidade*100.0).round()/100.0/100.0,
        "performance": performance,
        "qualidade": qualidade,
        "oee": (oee*100.0).round()/100.0/100.0
    }))
}
// ===== Horimetro (lógica) =====

fn parse_date(s: &str) -> Result<NaiveDate> {
    let d = NaiveDate::parse_from_str(s, "%Y-%m-%d")?;
    Ok(d)
}

pub fn get_horimetro_status(extrator_id: &str, data_str: &str) -> Result<serde_json::Value> {
    let date = parse_date(data_str)?;
    let tree = open_tree("horimetro")?;
    let mut turnos = std::collections::HashSet::new();
    for item in tree.iter() {
        let kv = item?;
        let v: Horimetro = serde_json::from_slice(&kv.1)?;
        if v.extrator_id == extrator_id && v.data == date {
            turnos.insert(v.turno.clone());
        }
    }
    let obj = serde_json::json!({
        "turno1": turnos.contains("1"),
        "turno2": turnos.contains("2"),
        "turno3": turnos.contains("3")
    });
    Ok(obj)
}

pub fn get_ultimo_horimetro(extrator_id: &str) -> Result<Option<serde_json::Value>> {
    let tree = open_tree("horimetro")?;
    let mut found: Option<Horimetro> = None;
    for item in tree.iter() {
        let kv = item?;
        let v: Horimetro = serde_json::from_slice(&kv.1)?;
        if v.extrator_id == extrator_id {
            if let Some(cur) = &found {
                if v.data > cur.data || (v.data == cur.data && v.turno > cur.turno) {
                    found = Some(v);
                }
            } else {
                found = Some(v);
            }
        }
    }
    if let Some(h) = found {
        let obj = serde_json::json!({
            "id": h.id,
            "extrator_id": h.extrator_id,
            "data": h.data.format("%Y-%m-%d").to_string(),
            "turno": h.turno,
            "valor": h.valor,
            "observacoes": h.observacoes,
            "created_at": h.created_at
        });
        Ok(Some(obj))
    } else {
        Ok(None)
    }
}

pub fn list_horimetros(
    extrator_id: Option<&str>,
    data_str: Option<&str>,
) -> Result<Vec<serde_json::Value>> {
    let mut out = Vec::new();
    let tree = open_tree("horimetro")?;
    for item in tree.iter() {
        let kv = item?;
        let v: Horimetro = serde_json::from_slice(&kv.1)?;
        if let Some(eid) = extrator_id {
            if v.extrator_id != eid {
                continue;
            }
        }
        if let Some(ds) = data_str {
            let d = parse_date(ds)?;
            if v.data != d {
                continue;
            }
        }
        let obj = serde_json::to_value(v)?;
        out.push(obj);
    }
    Ok(out)
}

pub fn upsert_horimetro(data: serde_json::Value) -> Result<serde_json::Value> {
    // Validate inputs
    let extrator_id = data["extrator_id"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("extrator_id obrigatório"))?
        .to_string();
    let data_str = data["data"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("data obrigatório"))?
        .to_string();
    let turno = data["turno"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("turno obrigatório"))?
        .to_string();
    let valor_raw = data.get("valor");
    let observacoes = data
        .get("observacoes")
        .and_then(|x| x.as_str())
        .map(|s| s.to_string());

    let date = parse_date(&data_str)?;

    // Collect horimetros for this extrator and date
    let tree = open_tree("horimetro")?;
    let mut horimetros_dia: Vec<Horimetro> = Vec::new();
    for item in tree.iter() {
        let kv = item?;
        let v: Horimetro = serde_json::from_slice(&kv.1)?;
        if v.extrator_id == extrator_id && v.data == date {
            horimetros_dia.push(v);
        }
    }

    // map existing and find existing record for same turno
    let mut valores_turnos: std::collections::HashMap<String, f64> =
        std::collections::HashMap::new();
    let mut existente: Option<Horimetro> = None;
    for h in &horimetros_dia {
        if h.turno == turno {
            existente = Some(h.clone());
        }
        valores_turnos.insert(h.turno.clone(), h.valor);
    }

    // if valor provided, update map
    let mut valor: Option<f64> = None;
    if let Some(vj) = valor_raw {
        if !vj.is_null() {
            valor = Some(
                vj.as_f64()
                    .ok_or_else(|| anyhow::anyhow!("valor inválido"))?,
            );
            valores_turnos.insert(turno.clone(), valor.unwrap());
        }
    }

    // Validations: map turnos to indices and validate order/deltas
    fn turno_to_index(s: &str) -> Option<usize> {
        match s {
            "1" | "06:00 - 14:00" => Some(0),
            "2" | "14:00 - 22:00" => Some(1),
            "3" | "22:00 - 06:00" => Some(2),
            _ => None,
        }
    }

    // Reject negative values early
    if let Some(v) = valor {
        if v < 0.0 {
            return Ok(serde_json::json!({
                "error": "validation",
                "field": format!("turno{}", turno),
                "message": "Valor não pode ser negativo",
                "hint": "Insira um valor maior ou igual a 0."
            }));
        }
    }

    if valor.is_some() {
        // Build array [turno1, turno2, turno3]
        let mut tvals: [Option<f64>; 3] = [None, None, None];
        for h in &horimetros_dia {
            if let Some(idx) = turno_to_index(&h.turno) {
                tvals[idx] = Some(h.valor);
            }
        }

        // set current turno value if provided
        let cur_idx = turno_to_index(&turno)
            .ok_or_else(|| anyhow::anyhow!("turno inválido"))?;
        if let Some(v) = valor {
            tvals[cur_idx] = Some(v);
        }

        // Pairwise order checks
        if let (Some(t1), Some(t2)) = (tvals[0], tvals[1]) {
            if t2 < t1 {
                return Ok(serde_json::json!({
                    "error": "validation",
                    "field": "turno2",
                    "message": format!("Turno 2 ({:.2}h) não pode ser menor que Turno 1 ({:.2}h)", t2, t1),
                    "hint": "Verifique os valores dos turnos 1 e 2."
                }));
            }
            let diff = t2 - t1;
            if diff > 8.0 {
                return Ok(serde_json::json!({
                    "error": "validation",
                    "field": "turno2",
                    "message": format!("Diferença entre Turno 1 e Turno 2 ({:.2}h) excede o máximo de 8h", diff),
                    "hint": "A diferença entre turnos consecutivos não pode exceder 8 horas."
                }));
            }
        }
        if let (Some(t2), Some(t3)) = (tvals[1], tvals[2]) {
            if t3 < t2 {
                return Ok(serde_json::json!({
                    "error": "validation",
                    "field": "turno3",
                    "message": format!("Turno 3 ({:.2}h) não pode ser menor que Turno 2 ({:.2}h)", t3, t2),
                    "hint": "Verifique os valores dos turnos 2 e 3."
                }));
            }
            let diff = t3 - t2;
            if diff > 8.0 {
                return Ok(serde_json::json!({
                    "error": "validation",
                    "field": "turno3",
                    "message": format!("Diferença entre Turno 2 e Turno 3 ({:.2}h) excede o máximo de 8h", diff),
                    "hint": "A diferença entre turnos consecutivos não pode exceder 8 horas."
                }));
            }
        }
        if let (Some(t1), Some(t3)) = (tvals[0], tvals[2]) {
            if t3 < t1 {
                return Ok(serde_json::json!({
                    "error": "validation",
                    "field": "turno3",
                    "message": format!("Turno 3 ({:.2}h) não pode ser menor que Turno 1 ({:.2}h)", t3, t1),
                    "hint": "Verifique os valores dos turnos 1 e 3."
                }));
            }
        }
    }

    // Update existing
    if let Some(mut e) = existente {
        if let Some(v) = valor {
            e.valor = v;
            e.created_at = Utc::now().to_rfc3339();
        }
        if let Some(o) = observacoes.clone() {
            e.observacoes = Some(o);
        }
        // persist: find record key by scanning
        for item in tree.iter() {
            let kv = item?;
            let v: Horimetro = serde_json::from_slice(&kv.1)?;
            if v.id == e.id {
                tree.insert(kv.0, serde_json::to_vec(&e)?)?;
                tree.flush()?;
                let obj = serde_json::to_value(&e)?;
                return Ok(obj);
            }
        }
    }

    // Create new
    if valor.is_none() && observacoes.is_none() {
        anyhow::bail!("Valor ou observações são necessários para criar um horímetro");
    }
    let id = Uuid::new_v4().to_string();
    let novo = Horimetro {
        id: id.clone(),
        extrator_id: extrator_id.clone(),
        data: date,
        turno: turno.clone(),
        observacoes: observacoes.clone(),
        valor: valor.unwrap_or(0.0),
        created_at: Utc::now().to_rfc3339(),
    };
    tree.insert(id.as_bytes(), serde_json::to_vec(&novo)?)?;
    tree.flush()?;
    Ok(serde_json::to_value(&novo)?)
}

pub fn pode_processar(extrator_id: &str, data_str: &str) -> Result<serde_json::Value> {
    let status = get_horimetro_status(extrator_id, data_str)?;
    let pode = status["turno1"].as_bool().unwrap_or(false)
        && status["turno2"].as_bool().unwrap_or(false)
        && status["turno3"].as_bool().unwrap_or(false);
    Ok(serde_json::json!({"pode": pode, "status": status}))
}

pub fn processar_dia(extrator_id: &str, data_str: &str) -> Result<serde_json::Value> {
    let date = parse_date(data_str)?;
    let tree = open_tree("horimetro")?;
    let mut hors: Vec<Horimetro> = Vec::new();
    for item in tree.iter() {
        let kv = item?;
        let v: Horimetro = serde_json::from_slice(&kv.1)?;
        if v.extrator_id == extrator_id && v.data == date {
            hors.push(v);
        }
    }
    hors.sort_by_key(|h| h.turno.clone());
    if hors.len() != 3 {
        anyhow::bail!("Todos os 3 turnos devem ser lançados");
    }

    // find previous horimetro
    let mut prev: Option<Horimetro> = None;
    for item in tree.iter() {
        let kv = item?;
        let v: Horimetro = serde_json::from_slice(&kv.1)?;
        if v.extrator_id == extrator_id
            && (v.data < date || (v.data == date && v.created_at < hors[0].created_at))
        {
            if let Some(cur) = &prev {
                if v.data > cur.data || (v.data == cur.data && v.turno > cur.turno) {
                    prev = Some(v);
                }
            } else {
                prev = Some(v);
            }
        }
    }
    let valor_inicial = prev.map(|p| p.valor).unwrap_or(0.0);
    let dif1 = hors[0].valor - valor_inicial;
    let dif2 = hors[1].valor - hors[0].valor;
    let dif3 = hors[2].valor - hors[1].valor;
    let horas_trabalhadas = dif1 + dif2 + dif3;
    let falta = 24.0 - horas_trabalhadas;
    let percentual = (horas_trabalhadas / 24.0) * 100.0;
    Ok(serde_json::json!({
        "horas_trabalhadas": (horas_trabalhadas * 100.0).round()/100.0,
        "falta": (falta * 100.0).round()/100.0,
        "percentual": (percentual * 100.0).round()/100.0 / 100.0,
        "diferencas": {
            "turno1": (dif1 * 100.0).round()/100.0,
            "turno2": (dif2 * 100.0).round()/100.0,
            "turno3": (dif3 * 100.0).round()/100.0
        }
    }))
}
