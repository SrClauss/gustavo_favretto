from app.db import SessionLocal
from app import models
from sqlalchemy import String
import uuid


def list_extratores(search: str = None, apenas_ativos: bool = True):
    """Lista extratores com busca opcional"""
    db = SessionLocal()
    try:
        query = db.query(models.Extrator)
        
        if apenas_ativos:
            query = query.filter(models.Extrator.ativo == True)
        
        if search:
            query = query.filter(
                (models.Extrator.modelo.ilike(f"%{search}%")) |
                (models.Extrator.numero.cast(String).ilike(f"%{search}%"))
            )
        
        extratores = query.order_by(models.Extrator.numero).all()
        
        return [{
            "id": e.id,
            "numero": e.numero,
            "modelo": e.modelo,
            "ativo": e.ativo
        } for e in extratores]
    finally:
        db.close()


def create_extrator(data: dict):
    """Cria um extrator"""
    db = SessionLocal()
    try:
        extrator = models.Extrator(
            id=str(uuid.uuid4()),
            numero=int(data["numero"]),
            modelo=data["modelo"],
            ativo=data.get("ativo", True)
        )
        db.add(extrator)
        db.commit()
        
        return {
            "id": extrator.id,
            "numero": extrator.numero,
            "modelo": extrator.modelo,
            "ativo": extrator.ativo
        }, 201
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def update_extrator(extrator_id: str, data: dict):
    """Atualiza um extrator"""
    db = SessionLocal()
    try:
        extrator = db.query(models.Extrator).filter(
            models.Extrator.id == extrator_id
        ).first()
        
        if not extrator:
            return {"error": "Extrator não encontrado"}, 404
        
        if "numero" in data:
            extrator.numero = int(data["numero"])
        if "modelo" in data:
            extrator.modelo = data["modelo"]
        if "ativo" in data:
            extrator.ativo = bool(data["ativo"])
        
        db.commit()
        return {
            "id": extrator.id,
            "numero": extrator.numero,
            "modelo": extrator.modelo,
            "ativo": extrator.ativo
        }, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def delete_extrator(extrator_id: str):
    """Soft delete de extrator"""
    db = SessionLocal()
    try:
        extrator = db.query(models.Extrator).filter(
            models.Extrator.id == extrator_id
        ).first()
        
        if not extrator:
            return {"error": "Extrator não encontrado"}, 404
        
        extrator.ativo = False
        db.commit()
        return {"message": "Extrator desativado"}, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


# ===== MOTIVOS PARADA =====

def list_motivos(search: str = None, apenas_ativos: bool = True):
    """Lista motivos de parada com busca opcional"""
    db = SessionLocal()
    try:
        query = db.query(models.MotivosParada)
        
        if apenas_ativos:
            query = query.filter(models.MotivosParada.ativo == True)
        
        if search:
            query = query.filter(models.MotivosParada.descricao.ilike(f"%{search}%"))
        
        motivos = query.order_by(models.MotivosParada.padrao.desc(), models.MotivosParada.descricao).all()
        
        return [{
            "id": m.id,
            "descricao": m.descricao,
            "classificacao": m.classificacao,
            "padrao": m.padrao,
            "ativo": m.ativo
        } for m in motivos]
    finally:
        db.close()


def create_motivo(data: dict):
    """Cria um motivo de parada"""
    db = SessionLocal()
    try:
        # Se marcar como padrão, desmarca os outros
        if data.get("padrao", False):
            db.query(models.MotivosParada).update({"padrao": False})
        
        motivo = models.MotivosParada(
            id=str(uuid.uuid4()),
            descricao=data["descricao"],
            classificacao=data["classificacao"],
            padrao=data.get("padrao", False),
            ativo=data.get("ativo", True)
        )
        db.add(motivo)
        db.commit()
        
        return {
            "id": motivo.id,
            "descricao": motivo.descricao,
            "classificacao": motivo.classificacao,
            "padrao": motivo.padrao,
            "ativo": motivo.ativo
        }, 201
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def update_motivo(motivo_id: str, data: dict):
    """Atualiza um motivo de parada"""
    db = SessionLocal()
    try:
        motivo = db.query(models.MotivosParada).filter(
            models.MotivosParada.id == motivo_id
        ).first()
        
        if not motivo:
            return {"error": "Motivo não encontrado"}, 404
        
        # Se marcar como padrão, desmarca os outros
        if data.get("padrao", False) and not motivo.padrao:
            db.query(models.MotivosParada).update({"padrao": False})
        
        if "descricao" in data:
            motivo.descricao = data["descricao"]
        if "classificacao" in data:
            motivo.classificacao = data["classificacao"]
        if "padrao" in data:
            motivo.padrao = bool(data["padrao"])
        if "ativo" in data:
            motivo.ativo = bool(data["ativo"])
        
        db.commit()
        return {
            "id": motivo.id,
            "descricao": motivo.descricao,
            "classificacao": motivo.classificacao,
            "padrao": motivo.padrao,
            "ativo": motivo.ativo
        }, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def delete_motivo(motivo_id: str):
    """Soft delete de motivo (não permite deletar o padrão)"""
    db = SessionLocal()
    try:
        motivo = db.query(models.MotivosParada).filter(
            models.MotivosParada.id == motivo_id
        ).first()
        
        if not motivo:
            return {"error": "Motivo não encontrado"}, 404
        
        if motivo.padrao:
            return {"error": "Não é possível desativar o motivo padrão"}, 400
        
        motivo.ativo = False
        db.commit()
        return {"message": "Motivo desativado"}, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


# ===== LOCAIS PARADA =====

def list_locais(search: str = None, apenas_ativos: bool = True):
    """Lista locais de parada com busca opcional"""
    db = SessionLocal()
    try:
        query = db.query(models.LocalParada)
        
        if apenas_ativos:
            query = query.filter(models.LocalParada.ativo == True)
        
        if search:
            query = query.filter(models.LocalParada.descricao.ilike(f"%{search}%"))
        
        locais = query.order_by(models.LocalParada.padrao.desc(), models.LocalParada.descricao).all()
        
        return [{
            "id": l.id,
            "descricao": l.descricao,
            "padrao": l.padrao,
            "ativo": l.ativo
        } for l in locais]
    finally:
        db.close()


def create_local(data: dict):
    """Cria um local de parada"""
    db = SessionLocal()
    try:
        # Se marcar como padrão, desmarca os outros
        if data.get("padrao", False):
            db.query(models.LocalParada).update({"padrao": False})
        
        local = models.LocalParada(
            id=str(uuid.uuid4()),
            descricao=data["descricao"],
            padrao=data.get("padrao", False),
            ativo=data.get("ativo", True)
        )
        db.add(local)
        db.commit()
        
        return {
            "id": local.id,
            "descricao": local.descricao,
            "padrao": local.padrao,
            "ativo": local.ativo
        }, 201
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def update_local(local_id: str, data: dict):
    """Atualiza um local de parada"""
    db = SessionLocal()
    try:
        local = db.query(models.LocalParada).filter(
            models.LocalParada.id == local_id
        ).first()
        
        if not local:
            return {"error": "Local não encontrado"}, 404
        
        # Se marcar como padrão, desmarca os outros
        if data.get("padrao", False) and not local.padrao:
            db.query(models.LocalParada).update({"padrao": False})
        
        if "descricao" in data:
            local.descricao = data["descricao"]
        if "padrao" in data:
            local.padrao = bool(data["padrao"])
        if "ativo" in data:
            local.ativo = bool(data["ativo"])
        
        db.commit()
        return {
            "id": local.id,
            "descricao": local.descricao,
            "padrao": local.padrao,
            "ativo": local.ativo
        }, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()


def delete_local(local_id: str):
    """Soft delete de local (não permite deletar o padrão)"""
    db = SessionLocal()
    try:
        local = db.query(models.LocalParada).filter(
            models.LocalParada.id == local_id
        ).first()
        
        if not local:
            return {"error": "Local não encontrado"}, 404
        
        if local.padrao:
            return {"error": "Não é possível desativar o local padrão"}, 400
        
        local.ativo = False
        db.commit()
        return {"message": "Local desativado"}, 200
    
    except Exception as e:
        db.rollback()
        return {"error": str(e)}, 500
    finally:
        db.close()
