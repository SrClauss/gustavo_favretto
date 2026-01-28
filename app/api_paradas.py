from app.db import SessionLocal
from app import models
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
            
            parada = models.Parada(
                id=str(uuid.uuid4()),
                data=data_obj,
                motivo=str(data["motivo"]),
                hora_inicio=str(data["hora_inicio"]),
                hora_fim=str(data["hora_fim"]),
                local_parada=str(data.get("local_parada")),
                observacoes=str(data.get("observacoes", "")),
                ativo=True
            )
            db.add(parada)
            
            # Adicionar extratores à relação muitos-para-muitos
            for extrator_id in data.get("extratores_parados", []):
                extrator_parado = models.ExtratorParado(
                    id=str(uuid.uuid4()),
                    parada_id=parada.id,
                    extrator_id=str(extrator_id)
                )
                db.add(extrator_parado)
            
            paradas_criadas.append({
                "id": parada.id,
                "data": parada.data.isoformat(),
                "motivo": parada.motivo,
                "hora_inicio": parada.hora_inicio,
                "hora_fim": parada.hora_fim,
                "local_parada": parada.local_parada,
                "observacoes": parada.observacoes,
                "extratores_parados": data.get("extratores_parados", [])
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
        query = db.query(models.Parada).filter(models.Parada.ativo == True)
        
        if data_str:
            data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
            query = query.filter(models.Parada.data == data_obj)
        
        if extrator_id:
            # Filtrar paradas onde o extrator está relacionado
            query = query.join(models.ExtratorParado).filter(models.ExtratorParado.extrator_id == extrator_id)
        
        paradas = query.order_by(models.Parada.data.desc()).all()
        
        result = []
        for p in paradas:
            # Carregar extratores relacionados
            extratores_ids = [ep.extrator_id for ep in p.extratores_parados_rel]
            result.append({
                "id": p.id,
                "data": p.data.isoformat(),
                "motivo": p.motivo,
                "hora_inicio": p.hora_inicio,
                "hora_fim": p.hora_fim,
                "local_parada": p.local_parada,
                "observacoes": p.observacoes,
                "extratores_parados": extratores_ids
            })
        return result
    finally:
        db.close()


def update_parada(parada_id: str, data: dict):
    """Atualiza uma parada"""
    db = SessionLocal()
    try:
        parada = db.query(models.Parada).filter(models.Parada.id == parada_id).first()
        
        if not parada:
            return {"error": "Parada não encontrada"}, 404
        
        if "motivo" in data:
            parada.motivo = str(data["motivo"])
        if "hora_inicio" in data:
            parada.hora_inicio = str(data["hora_inicio"])
        if "hora_fim" in data:
            parada.hora_fim = str(data["hora_fim"])
        if "local_parada" in data:
            parada.local_parada = str(data["local_parada"])
        if "observacoes" in data:
            parada.observacoes = str(data["observacoes"])
        if "extratores_parados" in data:
            parada.extratores_parados = json.dumps([str(e) for e in data["extratores_parados"]])
            # Atualizar tabela de associação
            db.query(models.ExtratorParado).filter(models.ExtratorParado.parada_id == parada_id).delete()
            for extrator_id in data["extratores_parados"]:
                extrator_parado = models.ExtratorParado(
                    id=str(uuid.uuid4()),
                    parada_id=parada.id,
                    extrator_id=str(extrator_id)
                )
                db.add(extrator_parado)
        
        db.commit()
        return {
            "id": parada.id,
            "data": parada.data.isoformat(),
            "motivo": parada.motivo,
            "hora_inicio": parada.hora_inicio,
            "hora_fim": parada.hora_fim,
            "local_parada": parada.local_parada,
            "observacoes": parada.observacoes,
            "extratores_parados": json.loads(parada.extratores_parados) if parada.extratores_parados else []
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
        parada = db.query(models.Parada).filter(models.Parada.id == parada_id).first()
        
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
    """Cria um feedback de produção"""
    db = SessionLocal()
    try:
        data_obj = datetime.strptime(data["data"], "%Y-%m-%d").date()
        
        feedback = models.FeedBackProducao(
            id=str(uuid.uuid4()),
            data=data_obj,
            produto=data["produto"],
            tamanho_da_fruta=float(data["tamanho_da_fruta"]),
            caixas_processadas=int(data["caixas_processadas"])
        )
        db.add(feedback)
        db.commit()
        
        return {
            "id": feedback.id,
            "data": feedback.data.isoformat(),
            "produto": feedback.produto,
            "tamanho_da_fruta": feedback.tamanho_da_fruta,
            "caixas_processadas": feedback.caixas_processadas
        }, 201
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def list_feedbacks(data_str: str = None):
    """Lista feedbacks com filtros opcionais"""
    db = SessionLocal()
    try:
        query = db.query(models.FeedBackProducao)
        
        if data_str:
            data_obj = datetime.strptime(data_str, "%Y-%m-%d").date()
            query = query.filter(models.FeedBackProducao.data == data_obj)
        
        feedbacks = query.order_by(models.FeedBackProducao.data.desc()).all()
        
        return [{
            "id": f.id,
            "data": f.data.isoformat(),
            "produto": f.produto,
            "tamanho_da_fruta": f.tamanho_da_fruta,
            "caixas_processadas": f.caixas_processadas
        } for f in feedbacks]
    finally:
        db.close()


def update_feedback(feedback_id: str, data: dict):
    """Atualiza um feedback"""
    db = SessionLocal()
    try:
        feedback = db.query(models.FeedBackProducao).filter(
            models.FeedBackProducao.id == feedback_id
        ).first()
        
        if not feedback:
            return {"error": "Feedback não encontrado"}, 404
        
        if "produto" in data:
            feedback.produto = data["produto"]
        if "tamanho_da_fruta" in data:
            feedback.tamanho_da_fruta = float(data["tamanho_da_fruta"])
        if "caixas_processadas" in data:
            feedback.caixas_processadas = int(data["caixas_processadas"])
        
        db.commit()
        return {
            "id": feedback.id,
            "data": feedback.data.isoformat(),
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
        feedback = db.query(models.FeedBackProducao).filter(
            models.FeedBackProducao.id == feedback_id
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
