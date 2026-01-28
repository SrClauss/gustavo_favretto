from app.db import SessionLocal
from app import models
from app import schemas
from datetime import  datetime
import uuid


def get_horimetro_status(extrator_id: str, data_str: str):
    """Retorna quais turnos já foram lançados para um extrator em uma data"""
    db = SessionLocal()
    try:
        data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
        horimetros = db.query(models.Horimetro).filter(
            models.Horimetro.extrator_id == extrator_id,
            models.Horimetro.data == data_obj
        ).all()
        
        turnos_lancados = {h.turno for h in horimetros}
        return {
            "turno1": models.Turnos.TURNO_1.value in turnos_lancados,
            "turno2": models.Turnos.TURNO_2.value in turnos_lancados,
            "turno3": models.Turnos.TURNO_3.value in turnos_lancados
        }
    finally:
        db.close()


def get_ultimo_horimetro(extrator_id: str):
    """Retorna o último horímetro cadastrado para um extrator"""
    db = SessionLocal()
    try:
        horimetro = db.query(models.Horimetro).filter(
            models.Horimetro.extrator_id == extrator_id
        ).order_by(
            models.Horimetro.data.desc(),
            models.Horimetro.turno.desc()
        ).first()
        
        if not horimetro:
            return None
        
        return {
            "id": horimetro.id,
            "extrator_id": horimetro.extrator_id,
            "data": horimetro.data.isoformat(),
            "turno": horimetro.turno,
            "valor": horimetro.valor,
            "observacoes": getattr(horimetro, 'observacoes', None),
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
    """Cria/atualiza horímetro com validações do mesmo dia:
    - Diferença máxima de 8h entre turnos consecutivos
    - Valores em ordem crescente (T1 <= T2 <= T3)
    """
    db = SessionLocal()
    try:
        extrator_id = str(data["extrator_id"])
        data_str = data["data"]
        turno = data["turno"]
        valor_raw = data.get("valor", None)
        observacoes = data.get("observacoes", None)

        # Converte valor se fornecido
        valor = None
        if valor_raw is not None:
            try:
                valor = float(valor_raw)
            except Exception:
                return {"error": "Valor inválido"}, 400

        data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()

        # Busca todos os horímetros do dia
        horimetros_dia = db.query(models.Horimetro).filter(
            models.Horimetro.extrator_id == extrator_id,
            models.Horimetro.data == data_obj
        ).all()

        # Cria mapa de valores atuais
        valores_turnos = {}
        existente = None
        for h in horimetros_dia:
            if h.turno == turno:
                existente = h
            valores_turnos[h.turno] = h.valor

        # Se estamos salvando/atualizando um valor, atualiza o mapa
        if valor is not None:
            valores_turnos[turno] = valor

        # Valida regras de negócio (apenas se estamos alterando um valor)
        if valor is not None:
            T1 = schemas.Turnos.TURNO_1.value
            T2 = schemas.Turnos.TURNO_2.value
            T3 = schemas.Turnos.TURNO_3.value

            # Validação 1: Ordem crescente
            if T1 in valores_turnos and T2 in valores_turnos:
                if valores_turnos[T2] < valores_turnos[T1]:
                    return {"error": f"Turno 2 ({valores_turnos[T2]}h) não pode ser menor que Turno 1 ({valores_turnos[T1]}h)"}, 400

            if T2 in valores_turnos and T3 in valores_turnos:
                if valores_turnos[T3] < valores_turnos[T2]:
                    return {"error": f"Turno 3 ({valores_turnos[T3]}h) não pode ser menor que Turno 2 ({valores_turnos[T2]}h)"}, 400

            if T1 in valores_turnos and T3 in valores_turnos:
                if valores_turnos[T3] < valores_turnos[T1]:
                    return {"error": f"Turno 3 ({valores_turnos[T3]}h) não pode ser menor que Turno 1 ({valores_turnos[T1]}h)"}, 400

            # Validação 2: Diferença máxima de 8h entre turnos consecutivos
            if T1 in valores_turnos and T2 in valores_turnos:
                diff = valores_turnos[T2] - valores_turnos[T1]
                if diff > 8:
                    return {"error": f"Diferença entre Turno 1 e Turno 2 ({diff:.2f}h) excede o máximo de 8h"}, 400

            if T2 in valores_turnos and T3 in valores_turnos:
                diff = valores_turnos[T3] - valores_turnos[T2]
                if diff > 8:
                    return {"error": f"Diferença entre Turno 2 e Turno 3 ({diff:.2f}h) excede o máximo de 8h"}, 400

        # Update de registro existente
        if existente:
            if valor is not None:
                existente.valor = valor
                existente.created_at = datetime.utcnow()
            if observacoes is not None:
                existente.observacoes = observacoes
            db.commit()
            return {
                "id": existente.id,
                "extrator_id": existente.extrator_id,
                "data": existente.data.isoformat(),
                "turno": existente.turno,
                "valor": existente.valor,
                "observacoes": existente.observacoes,
                "created_at": existente.created_at.isoformat()
            }, 200
        
        # Criação de novo registro
        else:
            if valor_raw is None and observacoes is None:
                return {"error": "Valor ou observações são necessários para criar um horímetro"}, 400
            
            valor_final = float(valor_raw) if valor_raw is not None else 0.0

            novo = models.Horimetro(
                id=str(uuid.uuid4()),
                extrator_id=extrator_id,
                data=data_obj,
                turno=turno,
                valor=valor_final,
                observacoes=observacoes,
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
                "observacoes": novo.observacoes,
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
        
        horimetros = db.query(models.Horimetro).filter(
            models.Horimetro.extrator_id == extrator_id,
            models.Horimetro.data == data_obj
        ).order_by(models.Horimetro.turno).all()
        
        if len(horimetros) != 3:
            return {"error": "Todos os 3 turnos devem ser lançados"}, 400
        
        # Busca horímetro anterior ao turno 1
        horimetro_anterior = db.query(models.Horimetro).filter(
            models.Horimetro.extrator_id == extrator_id
        ).filter(
            (models.Horimetro.data < data_obj) |
            ((models.Horimetro.data == data_obj) & (models.Horimetro.created_at < horimetros[0].created_at))
        ).order_by(
            models.Horimetro.data.desc(),
            models.Horimetro.turno.desc()
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



def list_horimetros_by_date(date: str):
    """Lista horímetros para uma data específica"""
    db = SessionLocal()
    try:
        data_obj = datetime.strptime(date, "%Y-%m-%d").date()
        horimetros = db.query(models.Horimetro).filter(
            models.Horimetro.data == data_obj
        ).order_by(
            models.Horimetro.extrator_id,
            models.Horimetro.turno
        ).all()
        
        return [{
            "id": h.id,
            "extrator_id": h.extrator_id,
            "data": h.data.isoformat(),
            "turno": h.turno,
            "valor": h.valor,
            "observacoes": getattr(h, 'observacoes', None),
            "created_at": h.created_at.isoformat()
        } for h in horimetros]
    finally:
        db.close()
    
def list_horimetros(extrator_id: str = None, data_str: str = None):
    """Lista horímetros com filtros opcionais"""
    db = SessionLocal()
    try:
        query = db.query(models.Horimetro)
        
        if extrator_id:
            query = query.filter(models.Horimetro.extrator_id == extrator_id)
        
        if data_str:
            data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
            query = query.filter(models.Horimetro.data == data_obj)
        
        horimetros = query.order_by(
            models.Horimetro.data.desc(),
            models.Horimetro.turno
        ).all()
        
        return [{
            "id": h.id,
            "extrator_id": h.extrator_id,
            "data": h.data.isoformat(),
            "turno": h.turno,
            "valor": h.valor,
            "observacoes": getattr(h, 'observacoes', None),
            "created_at": h.created_at.isoformat()
        } for h in horimetros]
    finally:
        db.close()
