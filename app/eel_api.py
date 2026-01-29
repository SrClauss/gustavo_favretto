import eel
import json
import os
from app import api_horimetro, api_paradas, api_cadastros, api_dashboard
from app.db import Base, engine, create_database_if_not_exists


# Inicializa o banco de dados
create_database_if_not_exists()


# ===== HORÍMETRO =====

@eel.expose
def get_horimetro_status(extrator_id, data):
    """Retorna quais turnos já foram lançados"""
    return api_horimetro.get_horimetro_status(extrator_id, data)
@eel.expose
def cawabunga():
    return "cawabunga"
@eel.expose
def soma(a, b):
    return a + b

@eel.expose
def get_ultimo_horimetro(extrator_id):
    """Retorna o último horímetro cadastrado"""
    return api_horimetro.get_ultimo_horimetro(extrator_id)


@eel.expose
def upsert_horimetro(data):
    """Cria ou atualiza horímetro"""
    resultado, status = api_horimetro.upsert_horimetro(data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def pode_processar(extrator_id, data):
    """Verifica se pode processar o dia"""
    return api_horimetro.pode_processar(extrator_id, data)


@eel.expose
def processar_dia(extrator_id, data):
    """Processa o dia e calcula horas trabalhadas"""
    resultado, status = api_horimetro.processar_dia(extrator_id, data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def list_horimetros(extrator_id=None, data=None):
    """Lista horímetros com filtros"""
    return api_horimetro.list_horimetros(extrator_id, data)


# ===== PARADAS =====

@eel.expose
def batch_create_paradas(paradas_data):
    """Cria múltiplas paradas"""
    resultado, status = api_paradas.batch_create_paradas(paradas_data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def list_paradas(data=None, extrator_id=None):
    """Lista paradas"""
    return api_paradas.list_paradas(data, extrator_id)


@eel.expose
def update_parada(parada_id, data):
    """Atualiza uma parada"""
    resultado, status = api_paradas.update_parada(parada_id, data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def delete_parada(parada_id):
    """Deleta uma parada"""
    resultado, status = api_paradas.delete_parada(parada_id)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


# ===== FEEDBACK =====

@eel.expose
def create_feedback(data):
    """Cria um feedback de produção"""
    resultado, status = api_paradas.create_feedback(data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def list_feedbacks(data=None):
    """Lista feedbacks"""
    return api_paradas.list_feedbacks(data)


@eel.expose
def update_feedback(feedback_id, data):
    """Atualiza um feedback"""
    resultado, status = api_paradas.update_feedback(feedback_id, data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def delete_feedback(feedback_id):
    """Deleta um feedback"""
    resultado, status = api_paradas.delete_feedback(feedback_id)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


# ===== EXTRATORES =====

@eel.expose
def list_extratores(search=None, apenas_ativos=True):
    """Lista extratores"""
    return api_cadastros.list_extratores(search, apenas_ativos)


@eel.expose
def create_extrator(data):
    """Cria um extrator"""
    resultado, status = api_cadastros.create_extrator(data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def update_extrator(extrator_id, data):
    """Atualiza um extrator"""
    resultado, status = api_cadastros.update_extrator(extrator_id, data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def delete_extrator(extrator_id):
    """Deleta um extrator"""
    resultado, status = api_cadastros.delete_extrator(extrator_id)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


# ===== MOTIVOS PARADA =====

@eel.expose
def list_motivos(search=None, apenas_ativos=True):
    """Lista motivos de parada"""
    return api_cadastros.list_motivos(search, apenas_ativos)


@eel.expose
def create_motivo(data):
    """Cria um motivo"""
    resultado, status = api_cadastros.create_motivo(data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def update_motivo(motivo_id, data):
    """Atualiza um motivo"""
    resultado, status = api_cadastros.update_motivo(motivo_id, data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def delete_motivo(motivo_id):
    """Deleta um motivo"""
    resultado, status = api_cadastros.delete_motivo(motivo_id)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


# ===== LOCAIS PARADA =====

@eel.expose
def list_locais(search=None, apenas_ativos=True):
    """Lista locais de parada"""
    return api_cadastros.list_locais(search, apenas_ativos)


@eel.expose
def create_local(data):
    """Cria um local"""
    resultado, status = api_cadastros.create_local(data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def update_local(local_id, data):
    """Atualiza um local"""
    resultado, status = api_cadastros.update_local(local_id, data)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado


@eel.expose
def delete_local(local_id):
    """Deleta um local"""
    resultado, status = api_cadastros.delete_local(local_id)
    if status >= 400:
        return {"error": resultado.get("error")}
    return resultado

@eel.expose
def list_horimetros_by_date(dia):
    """Retorna horímetros de uma data específica"""
    return api_horimetro.list_horimetros_by_date(dia)


# ===== CONFIGURAÇÕES =====

@eel.expose
def get_nominal_constant():
    """Retorna a constante nominal do sistema"""
    return api_dashboard.get_nominal_constant()


@eel.expose
def calculate_nominal(tamanho_fruta, caixas_produto, total_caixas):
    """Calcula o nominal para um produto"""
    return api_dashboard.calculate_nominal(
        float(tamanho_fruta),
        int(caixas_produto),
        int(total_caixas)
    )


# ===== DASHBOARD =====

@eel.expose
def get_dashboard_stats(periodo='dia', data_ref=None):
    """Retorna estatísticas consolidadas do dashboard"""
    return api_dashboard.get_dashboard_stats(periodo, data_ref)


@eel.expose
def get_timeline_paradas(data):
    """Retorna timeline de paradas para gráfico de Gantt"""
    return api_dashboard.get_timeline_paradas(data)


@eel.expose
def get_oee_stats(periodo='dia', data_ref=None, extrator_id=None):
    """Retorna cálculo de OEE"""
    return api_dashboard.get_oee_stats(periodo, data_ref, extrator_id)
