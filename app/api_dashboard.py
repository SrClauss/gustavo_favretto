from app.db import SessionLocal
from app import models
from datetime import datetime, timedelta
from sqlalchemy import func
from typing import Dict, List, Any
import json


def get_nominal_constant():
    """Retorna a constante nominal base do sistema"""
    return 110.909090909091


def calculate_nominal(tamanho_fruta: float, caixas_produto: int, total_caixas: int) -> float:
    """
    Calcula o nominal para um produto específico
    Args:
        tamanho_fruta: Tamanho da fruta (ex: 88, 100, 125)
        caixas_produto: Caixas processadas deste produto
        total_caixas: Total de caixas de todos os produtos
    Returns:
        Valor nominal calculado
    """
    if tamanho_fruta <= 0 or total_caixas <= 0:
        return 0.0
    
    nominal_base = get_nominal_constant()
    multiplicador = 5 * 60 * 11 * 24  # 5 * 60 * 11 * 24
    
    nominal_total = (nominal_base * multiplicador) / tamanho_fruta
    nominal_produto = nominal_total * (caixas_produto / total_caixas)
    
    return round(nominal_produto, 2)


def get_date_range(periodo: str, data_ref: str) -> tuple:
    """
    Calcula o intervalo de datas baseado no período
    Args:
        periodo: 'dia', 'semana', 'mes'
        data_ref: Data de referência no formato YYYY-MM-DD
    Returns:
        (data_inicio, data_fim)
    """
    data_ref_obj = datetime.strptime(data_ref, "%Y-%m-%d").date()
    
    if periodo == 'dia':
        return (data_ref_obj, data_ref_obj)
    elif periodo == 'semana':
        # Início da semana (segunda-feira)
        inicio = data_ref_obj - timedelta(days=data_ref_obj.weekday())
        fim = inicio + timedelta(days=6)
        return (inicio, fim)
    elif periodo == 'mes':
        inicio = data_ref_obj.replace(day=1)
        # Último dia do mês
        if data_ref_obj.month == 12:
            fim = data_ref_obj.replace(day=31)
        else:
            fim = (data_ref_obj.replace(month=data_ref_obj.month + 1, day=1) - timedelta(days=1))
        return (inicio, fim)
    else:
        return (data_ref_obj, data_ref_obj)


def get_dashboard_stats(periodo: str = 'dia', data_ref: str = None) -> Dict[str, Any]:
    """
    Retorna estatísticas consolidadas para o dashboard
    Args:
        periodo: 'dia', 'semana', 'mes'
        data_ref: Data de referência (default: hoje)
    """
    db = SessionLocal()
    try:
        if not data_ref:
            data_ref = datetime.now().strftime("%Y-%m-%d")
        
        data_inicio, data_fim = get_date_range(periodo, data_ref)
        
        # 1. Buscar feedbacks de produção
        feedbacks = db.query(models.FeedBackProducao).filter(
            models.FeedBackProducao.data.between(data_inicio, data_fim)
        ).all()
        
        total_caixas = sum(f.caixas_processadas for f in feedbacks)
        
        # Calcular capacidade nominal
        capacidade_nominal = 0
        if feedbacks:
            # Somar todos os caixas para calcular proporções
            for f in feedbacks:
                capacidade_nominal += calculate_nominal(
                    f.tamanho_da_fruta,
                    f.caixas_processadas,
                    total_caixas if total_caixas > 0 else 1
                )
        
        # Eficiência nominal
        eficiencia_nominal = (total_caixas / capacidade_nominal * 100) if capacidade_nominal > 0 else 0
        
        # 2. Status dos extratores
        extratores = db.query(models.Extrator).filter(models.Extrator.ativo == True).all()
        status_extratores = []
        
        for e in extratores:
            # Verificar se tem parada aberta (sem hora_fim ou hora_fim posterior à hora_inicio)
            parada_aberta = db.query(models.Parada).join(
                models.ExtratorParado
            ).filter(
                models.ExtratorParado.extrator_id == e.id,
                models.Parada.data == datetime.now().date(),
                models.Parada.ativo == True
            ).order_by(models.Parada.hora_inicio.desc()).first()
            
            status = "Parado" if parada_aberta else "Rodando"
            motivo_parada = None
            
            if parada_aberta:
                motivo = db.query(models.MotivosParada).filter(
                    models.MotivosParada.id == parada_aberta.motivo
                ).first()
                motivo_parada = motivo.descricao if motivo else "Desconhecido"
            
            status_extratores.append({
                "id": e.id,
                "numero": e.numero,
                "modelo": e.modelo,
                "status": status,
                "motivo_parada": motivo_parada
            })
        
        # 3. Top 5 motivos de parada
        paradas = db.query(
            models.Parada.motivo,
            func.count(models.Parada.id).label('quantidade')
        ).filter(
            models.Parada.data.between(data_inicio, data_fim),
            models.Parada.ativo == True
        ).group_by(
            models.Parada.motivo
        ).order_by(
            func.count(models.Parada.id).desc()
        ).limit(5).all()
        
        top_motivos = []
        for motivo_id, quantidade in paradas:
            motivo = db.query(models.MotivosParada).filter(
                models.MotivosParada.id == motivo_id
            ).first()
            
            if motivo:
                # Calcular tempo total em minutos
                paradas_motivo = db.query(models.Parada).filter(
                    models.Parada.motivo == motivo_id,
                    models.Parada.data.between(data_inicio, data_fim),
                    models.Parada.ativo == True
                ).all()
                
                tempo_total = 0
                for p in paradas_motivo:
                    try:
                        inicio = datetime.strptime(p.hora_inicio, "%H:%M")
                        fim = datetime.strptime(p.hora_fim, "%H:%M")
                        duracao = (fim - inicio).total_seconds() / 60
                        tempo_total += duracao
                    except:
                        pass
                
                top_motivos.append({
                    "motivo": motivo.descricao,
                    "classificacao": motivo.classificacao,
                    "quantidade": quantidade,
                    "tempo_total_minutos": round(tempo_total, 2)
                })
        
        # 4. Horas trabalhadas vs paradas
        horimetros = db.query(models.Horimetro).filter(
            models.Horimetro.data.between(data_inicio, data_fim)
        ).all()
        
        horas_trabalhadas = sum(h.valor for h in horimetros) if horimetros else 0
        
        # Tempo total de paradas
        paradas_periodo = db.query(models.Parada).filter(
            models.Parada.data.between(data_inicio, data_fim),
            models.Parada.ativo == True
        ).all()
        
        minutos_parados = 0
        for p in paradas_periodo:
            try:
                inicio = datetime.strptime(p.hora_inicio, "%H:%M")
                fim = datetime.strptime(p.hora_fim, "%H:%M")
                duracao = (fim - inicio).total_seconds() / 60
                minutos_parados += duracao
            except:
                pass
        
        horas_paradas = minutos_parados / 60
        
        # Calcular disponibilidade
        tempo_total = horas_trabalhadas + horas_paradas
        disponibilidade = (horas_trabalhadas / tempo_total * 100) if tempo_total > 0 else 0
        
        return {
            "periodo": periodo,
            "data_inicio": data_inicio.isoformat(),
            "data_fim": data_fim.isoformat(),
            "summary": {
                "total_caixas": total_caixas,
                "capacidade_nominal": round(capacidade_nominal, 2),
                "eficiencia_nominal": round(eficiencia_nominal, 2),
                "horas_trabalhadas": round(horas_trabalhadas, 2),
                "horas_paradas": round(horas_paradas, 2),
                "minutos_parados": round(minutos_parados, 2),
                "disponibilidade": round(disponibilidade, 2)
            },
            "status_extratores": status_extratores,
            "top_motivos_parada": top_motivos
        }
    
    finally:
        db.close()


def get_timeline_paradas(data: str) -> List[Dict[str, Any]]:
    """
    Retorna eventos para gráfico de Gantt de paradas
    Args:
        data: Data no formato YYYY-MM-DD
    """
    db = SessionLocal()
    try:
        data_obj = datetime.strptime(data, "%Y-%m-%d").date()
        
        paradas = db.query(models.Parada).filter(
            models.Parada.data == data_obj,
            models.Parada.ativo == True
        ).order_by(models.Parada.hora_inicio).all()
        
        eventos = []
        for p in paradas:
            # Buscar extratores afetados
            extratores_rel = db.query(models.ExtratorParado).filter(
                models.ExtratorParado.parada_id == p.id
            ).all()
            
            for ep in extratores_rel:
                extrator = db.query(models.Extrator).filter(
                    models.Extrator.id == ep.extrator_id
                ).first()
                
                motivo = db.query(models.MotivosParada).filter(
                    models.MotivosParada.id == p.motivo
                ).first()
                
                local = db.query(models.LocalParada).filter(
                    models.LocalParada.id == p.local_parada
                ).first() if p.local_parada else None
                
                eventos.append({
                    "extrator_id": extrator.id if extrator else None,
                    "extrator_numero": extrator.numero if extrator else 0,
                    "inicio": p.hora_inicio,
                    "fim": p.hora_fim,
                    "motivo": motivo.descricao if motivo else "Desconhecido",
                    "classificacao": motivo.classificacao if motivo else None,
                    "local": local.descricao if local else None,
                    "observacoes": p.observacoes
                })
        
        return eventos
    
    finally:
        db.close()


def get_oee_stats(periodo: str = 'dia', data_ref: str = None, extrator_id: str = None) -> Dict[str, Any]:
    """
    Calcula OEE (Overall Equipment Effectiveness)
    OEE = Disponibilidade × Performance × Qualidade
    """
    db = SessionLocal()
    try:
        if not data_ref:
            data_ref = datetime.now().strftime("%Y-%m-%d")
        
        data_inicio, data_fim = get_date_range(periodo, data_ref)
        
        # Filtro de extrator (opcional)
        query_horimetros = db.query(models.Horimetro).filter(
            models.Horimetro.data.between(data_inicio, data_fim)
        )
        
        if extrator_id:
            query_horimetros = query_horimetros.filter(models.Horimetro.extrator_id == extrator_id)
        
        horimetros = query_horimetros.all()
        
        # Disponibilidade: tempo operacional / tempo total planejado
        tempo_planejado = len(horimetros) * 8  # 8h por turno
        tempo_operacional = sum(h.valor for h in horimetros)
        disponibilidade = (tempo_operacional / tempo_planejado * 100) if tempo_planejado > 0 else 0
        
        # Performance: produção real / capacidade teórica
        # Simplificado: assumir 100% se produziu
        performance = 100.0
        
        # Qualidade: assumir 100% (não temos dados de refugo)
        qualidade = 100.0
        
        oee = (disponibilidade / 100) * (performance / 100) * (qualidade / 100) * 100
        
        return {
            "periodo": periodo,
            "data_inicio": data_inicio.isoformat(),
            "data_fim": data_fim.isoformat(),
            "disponibilidade": round(disponibilidade, 2),
            "performance": round(performance, 2),
            "qualidade": round(qualidade, 2),
            "oee": round(oee, 2)
        }
    
    finally:
        db.close()
