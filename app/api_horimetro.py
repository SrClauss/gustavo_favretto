from app.db import SessionLocal
from app import models_sqla, schemas
from sqlalchemy.exc import IntegrityError
from datetime import date, datetime
import uuid
import json


def get_horimetro_status(extrator_id: str, data_str: str):
    """Retorna quais turnos já foram lançados para um extrator em uma data"""
    db = SessionLocal()
    try:
        data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
        horimetros = db.query(models_sqla.Horimetro).filter(
            models_sqla.Horimetro.extrator_id == extrator_id,
            models_sqla.Horimetro.data == data_obj
        ).all()
        
        turnos_lancados = {h.turno for h in horimetros}
        return {
            "turno1": schemas.Turnos.TURNO_1.value in turnos_lancados,
            "turno2": schemas.Turnos.TURNO_2.value in turnos_lancados,
            "turno3": schemas.Turnos.TURNO_3.value in turnos_lancados
        }
    finally:
        db.close()


def get_ultimo_horimetro(extrator_id: str):
    """Retorna o último horímetro cadastrado para um extrator"""
    db = SessionLocal()
    try:
        horimetro = db.query(models_sqla.Horimetro).filter(
            models_sqla.Horimetro.extrator_id == extrator_id
        ).order_by(
            models_sqla.Horimetro.data.desc(),
            models_sqla.Horimetro.turno.desc()
        ).first()
        
        if not horimetro:
            return None
        
        return {
            "id": horimetro.id,
            "extrator_id": horimetro.extrator_id,
            "data": horimetro.data.isoformat(),
            "turno": horimetro.turno,
            "valor": horimetro.valor,
            "created_at": horimetro.created_at.isoformat()
        }
    finally:
        db.close()


def validar_sequencia_turno(extrator_id: str, data_str: str, turno: str):
    """Valida se o turno pode ser lançado (sequência 1->2->3)"""
    status = get_horimetro_status(extrator_id, data_str)
    
    if turno == schemas.Turnos.TURNO_2.value and not status["turno1"]:
        return False, "Turno 1 deve ser lançado primeiro"
    
    if turno == schemas.Turnos.TURNO_3.value and (not status["turno1"] or not status["turno2"]):
        return False, "Turnos 1 e 2 devem ser lançados primeiro"
    
    return True, ""


def upsert_horimetro(data: dict):
    """Cria/atualiza horímetro com validações de sequência e diferença"""
    db = SessionLocal()
    try:
        extrator_id = str(data["extrator_id"])
        data_str = data["data"]
        turno = data["turno"]
        valor = float(data["valor"])
        
        # Valida sequência de turnos
        valido, erro = validar_sequencia_turno(extrator_id, data_str, turno)
        if not valido:
            return {"error": erro}, 400
        
        # Busca último horímetro
        ultimo = get_ultimo_horimetro(extrator_id)
        
        if ultimo:
            diferenca = valor - ultimo["valor"]
            
            if diferenca < 0:
                return {"error": "Horímetro não pode regredir (valor menor que o anterior)"}, 400
            
            if diferenca > 8:
                return {"error": f"Diferença de {diferenca:.2f}h excede o máximo de 8h por turno"}, 400
        
        # Cria ou atualiza
        data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
        
        # Verifica se já existe
        existente = db.query(models_sqla.Horimetro).filter(
            models_sqla.Horimetro.extrator_id == extrator_id,
            models_sqla.Horimetro.data == data_obj,
            models_sqla.Horimetro.turno == turno
        ).first()
        
        if existente:
            existente.valor = valor
            existente.created_at = datetime.utcnow()
            db.commit()
            return {
                "id": existente.id,
                "extrator_id": existente.extrator_id,
                "data": existente.data.isoformat(),
                "turno": existente.turno,
                "valor": existente.valor,
                "created_at": existente.created_at.isoformat()
            }, 200
        else:
            novo = models_sqla.Horimetro(
                id=str(uuid.uuid4()),
                extrator_id=extrator_id,
                data=data_obj,
                turno=turno,
                valor=valor,
                created_at=datetime.utcnow()
            )
            db.add(novo)
            db.commit()
            return {
                "id": novo.id,
                "extrator_id": novo.extrator_id,
                "data": novo.data.isoformat(),
                "turno": novo.turno,
                "valor": novo.valor,
                "created_at": novo.created_at.isoformat()
            }, 201
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def pode_processar(extrator_id: str, data_str: str):
    """Verifica se os 3 turnos foram lançados"""
    status = get_horimetro_status(extrator_id, data_str)
    pode = status["turno1"] and status["turno2"] and status["turno3"]
    return {"pode": pode, "status": status}


def processar_dia(extrator_id: str, data_str: str):
    """Calcula horas trabalhadas e retorna quanto falta para 24h"""
    db = SessionLocal()
    try:
        data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
        
        horimetros = db.query(models_sqla.Horimetro).filter(
            models_sqla.Horimetro.extrator_id == extrator_id,
            models_sqla.Horimetro.data == data_obj
        ).order_by(models_sqla.Horimetro.turno).all()
        
        if len(horimetros) != 3:
            return {"error": "Todos os 3 turnos devem ser lançados"}, 400
        
        # Busca horímetro anterior ao turno 1
        horimetro_anterior = db.query(models_sqla.Horimetro).filter(
            models_sqla.Horimetro.extrator_id == extrator_id
        ).filter(
            (models_sqla.Horimetro.data < data_obj) |
            ((models_sqla.Horimetro.data == data_obj) & (models_sqla.Horimetro.created_at < horimetros[0].created_at))
        ).order_by(
            models_sqla.Horimetro.data.desc(),
            models_sqla.Horimetro.turno.desc()
        ).first()
        
        valor_inicial = horimetro_anterior.valor if horimetro_anterior else 0
        
        # Calcula diferenças
        dif1 = horimetros[0].valor - valor_inicial
        dif2 = horimetros[1].valor - horimetros[0].valor
        dif3 = horimetros[2].valor - horimetros[1].valor
        
        horas_trabalhadas = dif1 + dif2 + dif3
        falta = 24 - horas_trabalhadas
        percentual = (horas_trabalhadas / 24) * 100
        
        return {
            "horas_trabalhadas": round(horas_trabalhadas, 2),
            "falta": round(falta, 2),
            "percentual": round(percentual, 2),
            "diferencas": {
                "turno1": round(dif1, 2),
                "turno2": round(dif2, 2),
                "turno3": round(dif3, 2)
            }
        }, 200
    
    except Exception as e:
        return {"error": str(e)}, 500
    finally:
        db.close()


def list_horimetros(extrator_id: str = None, data_str: str = None):
    """Lista horímetros com filtros opcionais"""
    db = SessionLocal()
    try:
        query = db.query(models_sqla.Horimetro)
        
        if extrator_id:
            query = query.filter(models_sqla.Horimetro.extrator_id == extrator_id)
        
        if data_str:
            data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
            query = query.filter(models_sqla.Horimetro.data == data_obj)
        
        horimetros = query.order_by(
            models_sqla.Horimetro.data.desc(),
            models_sqla.Horimetro.turno
        ).all()
        
        return [{
            "id": h.id,
            "extrator_id": h.extrator_id,
            "data": h.data.isoformat(),
            "turno": h.turno,
            "valor": h.valor,
            "created_at": h.created_at.isoformat()
        } for h in horimetros]
    finally:
        db.close()
