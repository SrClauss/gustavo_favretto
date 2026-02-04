use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Extrator {
    pub id: String,
    pub numero: i32,
    pub modelo: String,
    pub ativo: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Parada {
    pub id: String,
    pub data: NaiveDate,
    pub motivo: String,
    pub hora_inicio: String,
    pub hora_fim: String,
    pub local_parada: Option<String>,
    pub observacoes: Option<String>,
    pub extratores_parados: Vec<String>,
    pub ativo: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Horimetro {
    pub id: String,
    pub extrator_id: String,
    pub data: NaiveDate,
    pub turno: String,
    pub observacoes: Option<String>,
    pub valor: f64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeedBackProducao {
    pub id: String,
    pub data: NaiveDate,
    pub produto: String,
    pub tamanho_da_fruta: f64,
    pub caixas_processadas: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MotivosParada {
    pub id: String,
    pub descricao: String,
    pub classificacao: Option<String>,
    pub padrao: bool,
    pub ativo: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalParada {
    pub id: String,
    pub descricao: String,
    pub padrao: bool,
    pub ativo: bool,
}
