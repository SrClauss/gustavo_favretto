from app.db import SessionLocal
from app import models_sqla, schemas
from datetime import datetime
import uuid
import json


def batch_create_paradas(paradas_data: list):
    """Cria múltiplas paradas de uma vez"""
    db = SessionLocal()
    try:
        paradas_criadas = []
        
        for data in paradas_data:
            data_obj = datetime.strptime(data["data"], "%Y-%m-%d").date()
            extratores_parados_json = json.dumps([str(e) for e in data.get("extratores_parados", [])])
            
            parada = models_sqla.Parada(
                id=str(uuid.uuid4()),
                extrator_id=str(data["extrator_id"]),
                data=data_obj,
                turno=data["turno"],
                motivo=str(data["motivo"]),
                duracao_minutos=int(data["duracao_minutos"]),
                local_parada=str(data["local_parada"]),
                extratores_parados=extratores_parados_json,
                ativo=True
            )
            db.add(parada)
            paradas_criadas.append({
                "id": parada.id,
                "extrator_id": parada.extrator_id,
                "data": parada.data.isoformat(),
                "turno": parada.turno,
                "motivo": parada.motivo,
                "duracao_minutos": parada.duracao_minutos,
                "local_parada": parada.local_parada
            })
        
        db.commit()
        return paradas_criadas, 201
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def list_paradas(data_str: str = None, extrator_id: str = None):
    """Lista paradas com filtros opcionais"""
    db = SessionLocal()
    try:
        query = db.query(models_sqla.Parada).filter(models_sqla.Parada.ativo == True)
        
        if data_str:
            data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
            query = query.filter(models_sqla.Parada.data == data_obj)
        
        if extrator_id:
            query = query.filter(models_sqla.Parada.extrator_id == extrator_id)
        
        paradas = query.order_by(models_sqla.Parada.data.desc(), models_sqla.Parada.turno).all()
        
        return [{
            "id": p.id,
            "extrator_id": p.extrator_id,
            "data": p.data.isoformat(),
            "turno": p.turno,
            "motivo": p.motivo,
            "duracao_minutos": p.duracao_minutos,
            "local_parada": p.local_parada,
            "extratores_parados": json.loads(p.extratores_parados) if p.extratores_parados else []
        } for p in paradas]
    finally:
        db.close()


def update_parada(parada_id: str, data: dict):
    """Atualiza uma parada"""
    db = SessionLocal()
    try:
        parada = db.query(models_sqla.Parada).filter(models_sqla.Parada.id == parada_id).first()
        
        if not parada:
            return {"error": "Parada não encontrada"}, 404
        
        if "motivo" in data:
            parada.motivo = str(data["motivo"])
        if "duracao_minutos" in data:
            parada.duracao_minutos = int(data["duracao_minutos"])
        if "local_parada" in data:
            parada.local_parada = str(data["local_parada"])
        if "turno" in data:
            parada.turno = data["turno"]
        
        db.commit()
        return {
            "id": parada.id,
            "extrator_id": parada.extrator_id,
            "data": parada.data.isoformat(),
            "turno": parada.turno,
            "motivo": parada.motivo,
            "duracao_minutos": parada.duracao_minutos,
            "local_parada": parada.local_parada
        }, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def delete_parada(parada_id: str):
    """Soft delete de uma parada"""
    db = SessionLocal()
    try:
        parada = db.query(models_sqla.Parada).filter(models_sqla.Parada.id == parada_id).first()
        
        if not parada:
            return {"error": "Parada não encontrada"}, 404
        
        parada.ativo = False
        db.commit()
        return {"message": "Parada removida"}, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


# ===== FEEDBACK PRODUÇÃO =====

def create_feedback(data: dict):
    """Cria um feedback de produção (tamanho_da_fruta, caixas_processadas)"""
    db = SessionLocal()
    try:
        data_obj = datetime.strptime(data["data"], "%Y-%m-%d").date()
        
        feedback = models_sqla.FeedBackProducao(
            id=str(uuid.uuid4()),
            extrator_id=str(data["extrator_id"]),
            data=data_obj,
            turno=data["turno"],
            produto=data["produto"],
            tamanho_da_fruta=int(data.get("tamanho_da_fruta", 0)),
            caixas_processadas=int(data.get("caixas_processadas", 0))
        )
        db.add(feedback)
        db.commit()
        
        return {
            "id": feedback.id,
            "extrator_id": feedback.extrator_id,
            "data": feedback.data.isoformat(),
            "turno": feedback.turno,
            "produto": feedback.produto,
            "tamanho_da_fruta": feedback.tamanho_da_fruta,
            "caixas_processadas": feedback.caixas_processadas
        }, 201
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def list_feedbacks(data_str: str = None, extrator_id: str = None):
    """Lista feedbacks com filtros opcionais"""
    db = SessionLocal()
    try:
        query = db.query(models_sqla.FeedBackProducao)
        
        if data_str:
            data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
            query = query.filter(models_sqla.FeedBackProducao.data == data_obj)
        
        if extrator_id:
            query = query.filter(models_sqla.FeedBackProducao.extrator_id == extrator_id)
        
        feedbacks = query.order_by(models_sqla.FeedBackProducao.data.desc(), models_sqla.FeedBackProducao.turno).all()
        
        return [{
            "id": f.id,
            "extrator_id": f.extrator_id,
            "data": f.data.isoformat(),
            "turno": f.turno,
            "produto": f.produto,
            "tamanho_da_fruta": f.tamanho_da_fruta,
            "caixas_processadas": f.caixas_processadas
        } for f in feedbacks]
    finally:
        db.close()


def update_feedback(feedback_id: str, data: dict):
    """Atualiza um feedback (tamanho_da_fruta, caixas_processadas)"""
    db = SessionLocal()
    try:
        feedback = db.query(models_sqla.FeedBackProducao).filter(
            models_sqla.FeedBackProducao.id == feedback_id
        ).first()
        
        if not feedback:
            return {"error": "Feedback não encontrado"}, 404
        
        if "produto" in data:
            feedback.produto = data["produto"]
        if "tamanho_da_fruta" in data:
            feedback.tamanho_da_fruta = int(data["tamanho_da_fruta"])
        if "caixas_processadas" in data:
            feedback.caixas_processadas = int(data["caixas_processadas"])
        if "turno" in data:
            feedback.turno = data["turno"]
        
        db.commit()
        return {
            "id": feedback.id,
            "extrator_id": feedback.extrator_id,
            "data": feedback.data.isoformat(),
            "turno": feedback.turno,
            "produto": feedback.produto,
            "tamanho_da_fruta": feedback.tamanho_da_fruta,
            "caixas_processadas": feedback.caixas_processadas
        }, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def delete_feedback(feedback_id: str):
    """Deleta um feedback"""
    db = SessionLocal()
    try:
        feedback = db.query(models_sqla.FeedBackProducao).filter(
            models_sqla.FeedBackProducao.id == feedback_id
        ).first()
        
        if not feedback:
            return {"error": "Feedback não encontrado"}, 404
        
        db.delete(feedback)
        db.commit()
        return {"message": "Feedback removido"}, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()
