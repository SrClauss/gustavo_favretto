#[cfg(test)]
mod tests {
    use crate::db;
    use serde_json::json;

    #[test]
    fn test_extrator_create_list() {
        // Use temporary DB to avoid filesystem permission issues on Windows/CI
        db::init_db_temporary().unwrap();

        let payload = json!({"numero": 1, "modelo": "X"});
        let created = db::create_extrator(payload).unwrap();
        let list = db::list_extratores().unwrap();
        assert!(list.len() >= 1);
        assert!(list.iter().any(|e| e.id == created.id));
    }

    #[test]
    fn test_paradas_crud() {
        // Use temporary DB to avoid filesystem permission issues on Windows/CI
        db::init_db_temporary().unwrap();

        let p = json!({"data": "2026-02-03", "motivo": "m1", "hora_inicio": "08:00", "hora_fim": "09:00", "extratores_parados": []});
        let created = db::create_parada(p).unwrap();
        let created_id = created["id"].as_str().unwrap().to_string();
        let listed = db::list_paradas_filtered(Some("2026-02-03"), None).unwrap();
        assert!(listed.iter().any(|x| x.id == created_id));

        db::delete_parada(&created_id).unwrap();
        let listed2 = db::list_paradas_filtered(Some("2026-02-03"), None).unwrap();
        assert!(!listed2.iter().any(|x| x.id == created_id));
    }

    #[test]
    fn test_calculate_nominal_proportionality() {
        // simple proportionality test: doubling caixas_produto doubles nominal
        let a = db::calculate_nominal(150.0, 10, 20);
        let b = db::calculate_nominal(150.0, 20, 20);
        assert!((b - a * 2.0).abs() < 0.01);

        // edge case: tamanho_fruta <= 0 or total_caixas <= 0 should yield 0
        let z1 = db::calculate_nominal(0.0, 10, 20);
        assert_eq!(z1, 0.0);
        let z2 = db::calculate_nominal(150.0, 10, 0);
        assert_eq!(z2, 0.0);
    }

    #[test]
    fn test_upsert_horimetro_and_processar() {
        db::init_db_temporary().unwrap();
        // create extrator
        let payload = json!({"numero": 7, "modelo": "Z"});
        let extr = db::create_extrator(payload).unwrap();

        // insert turno1
        let t = json!({"extrator_id": extr.id, "data": "2026-02-04", "turno": "1", "valor": 10.0});
        db::upsert_horimetro(t).unwrap();

        // insert turno2
        let t2 = json!({"extrator_id": extr.id, "data": "2026-02-04", "turno": "2", "valor": 12.0});
        db::upsert_horimetro(t2).unwrap();

        // insert turno3
        let t3 = json!({"extrator_id": extr.id, "data": "2026-02-04", "turno": "3", "valor": 16.0});
        db::upsert_horimetro(t3).unwrap();

        // processar dia
        let res = db::processar_dia(&extr.id, "2026-02-04").unwrap();
        let horas_trabalhadas = res["horas_trabalhadas"].as_f64().unwrap();
        assert!((horas_trabalhadas - 16.0).abs() < 0.01);

        // pode_processar should be true
        let p = db::pode_processar(&extr.id, "2026-02-04").unwrap();
        assert_eq!(p["pode"].as_bool().unwrap(), true);
    }

    #[test]
    fn test_upsert_horimetro_validations() {
        db::init_db_temporary().unwrap();
        let payload = json!({"numero": 8, "modelo": "V"});
        let extr = db::create_extrator(payload).unwrap();

        // insert turno1 = 10
        let t1 = json!({"extrator_id": extr.id, "data": "2026-02-05", "turno": "1", "valor": 10.0});
        db::upsert_horimetro(t1).unwrap();

        // attempt turno2 < turno1 -> should error
        let t2_bad = json!({"extrator_id": extr.id, "data": "2026-02-05", "turno": "2", "valor": 9.0});
        let e = db::upsert_horimetro(t2_bad).err().unwrap().to_string();
        assert!(e.contains("não pode ser menor"));

        // attempt diff > 8h
        let t2_bad2 = json!({"extrator_id": extr.id, "data": "2026-02-05", "turno": "2", "valor": 20.0});
        let e2 = db::upsert_horimetro(t2_bad2).err().unwrap().to_string();
        assert!(e2.contains("excede o máximo de 8h"));
    }

    #[test]
    fn test_upsert_horimetro_subsequent_decrease_rejected() {
        db::init_db_temporary().unwrap();
        let payload = json!({"numero": 11, "modelo": "S"});
        let extr = db::create_extrator(payload).unwrap();

        // insert t1=10, t2=15
        db::upsert_horimetro(json!({"extrator_id": extr.id, "data": "2026-02-07", "turno": "1", "valor": 10.0})).unwrap();
        db::upsert_horimetro(json!({"extrator_id": extr.id, "data": "2026-02-07", "turno": "2", "valor": 15.0})).unwrap();

        // now attempt to reduce t2 below t1
        let t2_reduce = json!({"extrator_id": extr.id, "data": "2026-02-07", "turno": "2", "valor": 9.0});
        let e = db::upsert_horimetro(t2_reduce).err().unwrap().to_string();
        assert!(e.contains("não pode ser menor"));
    }

    #[test]
    fn test_upsert_horimetro_observacoes_only_creates() {
        db::init_db_temporary().unwrap();
        let payload = json!({"numero": 12, "modelo": "O"});
        let extr = db::create_extrator(payload).unwrap();

        // upsert with only observacoes
        let o = json!({"extrator_id": extr.id, "data": "2026-02-08", "turno": "1", "observacoes": "observed"});
        let created = db::upsert_horimetro(o).unwrap();
        assert!(created["valor"].as_f64().unwrap() == 0.0);
        assert!(created["observacoes"].as_str().unwrap() == "observed");
    }

    #[test]
    fn test_get_dashboard_stats_basic() {
        db::init_db_temporary().unwrap();

    }

    #[test]
    fn test_create_parada_time_validation() {
        db::init_db_temporary().unwrap();

        // hora_fim anterior a hora_inicio deve resultar em erro de validação
        let p_bad = json!({"data": "2026-02-03", "motivo": "m1", "hora_inicio": "09:00", "hora_fim": "08:00", "extratores_parados": []});
        let created = db::create_parada(p_bad).unwrap();
        assert!(created["error"].as_str().unwrap() == "validation");
        assert!(created["field"].as_str().unwrap() == "hora_fim");
    }

    #[test]
    fn test_get_dashboard_stats_basic() {
        db::init_db_temporary().unwrap();

        // create motivo and extrator
        let motivo = db::create_motivo(json!({"descricao": "M1", "classificacao": "Disponibilidade", "padrao": false, "ativo": true})).unwrap();
        let extr = db::create_extrator(json!({"numero": 9, "modelo": "W"})).unwrap();

        // create a parada using motivo
        let _p = db::create_parada(json!({"data": "2026-02-06", "motivo": motivo.id, "hora_inicio": "08:00", "hora_fim": "09:00", "extratores_parados": [extr.id.clone()]})).unwrap();

        // create feedbacks
        let _f1 = db::create_feedback(json!({"data": "2026-02-06", "produto": "P1", "tamanho_da_fruta": 120.0, "caixas_processadas": 30})).unwrap();
        let _f2 = db::create_feedback(json!({"data": "2026-02-06", "produto": "P2", "tamanho_da_fruta": 100.0, "caixas_processadas": 20})).unwrap();

        // create horimetros (3 turnos) - values chosen to respect validation rules (diff <= 8h)
        let _t1 = db::upsert_horimetro(json!({"extrator_id": extr.id, "data": "2026-02-06", "turno": "1", "valor": 0.0})).unwrap();
        let _t2 = db::upsert_horimetro(json!({"extrator_id": extr.id, "data": "2026-02-06", "turno": "2", "valor": 8.0})).unwrap();
        let _t3 = db::upsert_horimetro(json!({"extrator_id": extr.id, "data": "2026-02-06", "turno": "3", "valor": 16.0})).unwrap();

        let stats = db::get_dashboard_stats("dia", "2026-02-06").unwrap();
        let summary = &stats["summary"];

        assert_eq!(summary["total_caixas"].as_i64().unwrap(), 50);
        assert!(summary["capacidade_nominal"].as_f64().unwrap() > 0.0);

        // top motivos should include our motivo with quantidade 1
        let top = stats["top_motivos_parada"].as_array().unwrap();
        assert!(top.iter().any(|m| m["motivo"].as_str().unwrap() == "M1" && m["quantidade"].as_i64().unwrap() == 1));

        // disponibilidade is a percentage between 0 and 100
        let disponibilidade = summary["disponibilidade"].as_f64().unwrap() * 100.0; // stored as fraction
        assert!(disponibilidade >= 0.0 && disponibilidade <= 100.0);
    }
}
