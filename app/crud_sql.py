from typing import List, Optional
import uuid
import json
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session
from contextlib import contextmanager
import os

from .db import SessionLocal, engine, Base
from . import schemas as pmodels
from . import models_sqla as sqm

# create tables
Base.metadata.create_all(bind=engine)

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
os.makedirs(DATA_DIR, exist_ok=True)

@contextmanager
def session_scope():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _to_pydantic(model_cls, row):
    if row is None:
        return None
    data = {c.name: getattr(row, c.name) for c in row.__table__.columns}
    # if extratores_parados is stored as JSON text, parse
    if 'extratores_parados' in data and data['extratores_parados']:
        try:
            data['extratores_parados'] = json.loads(data['extratores_parados'])
        except Exception:
            pass
    # convert strings as needed; Pydantic will coerce
    return model_cls.parse_obj(data)

# CRUD Extrator
def upsert_extrator(item: pmodels.Extrator) -> pmodels.Extrator:
    with SessionLocal() as s:
        obj = s.get(sqm.Extrator, str(item.id)) if item.id else None
        if obj is None:
            obj = sqm.Extrator(id=str(item.id or uuid.uuid4()), numero=item.numero, modelo=item.modelo, ativo=item.ativo)
            s.add(obj)
        else:
            obj.numero = item.numero
            obj.modelo = item.modelo
            obj.ativo = item.ativo
        s.commit(); s.refresh(obj)
        return _to_pydantic(pmodels.Extrator, obj)


def delete_extrator(id_value: uuid.UUID) -> bool:
    # mark extrator as inactive and dump affected paradas to json
    with SessionLocal() as s:
        obj = s.get(sqm.Extrator, str(id_value))
        if not obj:
            return False
        # find paradas where extrator is in extratores_parados
        rows = s.query(sqm.Parada).filter(sqm.Parada.extratores_parados.isnot(None)).all()
        affected = {'paradas_with_extrator_id': [], 'paradas_with_in_list': []}
        for r in rows:
            # parse extratores_parados json
            try:
                arr = json.loads(r.extratores_parados)
            except Exception:
                arr = []
            if str(id_value) in arr:
                affected['paradas_with_in_list'].append(r.id)
        # paradas where extrator_id == id
        rows2 = s.query(sqm.Parada).filter(sqm.Parada.extrator_id == str(id_value)).all()
        for r in rows2:
            affected['paradas_with_extrator_id'].append(r.id)
        # write json
        out_path = os.path.join(DATA_DIR, f'deleted_extrator_{id_value}.json')
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(affected, f, ensure_ascii=False, indent=2)
        # mark extrator inactive
        obj.ativo = False
        s.commit()
        return True


def list_extratores() -> List[pmodels.Extrator]:
    with SessionLocal() as s:
        rows = s.query(sqm.Extrator).all()
        return [_to_pydantic(pmodels.Extrator, r) for r in rows]


def search_extratores_by_modelo(substr: str) -> List[pmodels.Extrator]:
    with SessionLocal() as s:
        q = s.query(sqm.Extrator).filter(func.lower(sqm.Extrator.modelo).contains(substr.lower()))
        return [_to_pydantic(pmodels.Extrator, r) for r in q.all()]

# MotivosParada with atomic delete behavior
def upsert_motivo(item: pmodels.MotivosParada) -> pmodels.MotivosParada:
    with SessionLocal() as s:
        obj = s.get(sqm.MotivosParada, str(item.id)) if item.id else None
        if obj is None:
            obj = sqm.MotivosParada(id=str(item.id or uuid.uuid4()), descricao=item.descricao, classificacao=item.classificacao.value, padrao=item.padrao, ativo=item.ativo)
            s.add(obj)
        else:
            # if setting padrao True, clear others
            if item.padrao:
                s.query(sqm.MotivosParada).update({sqm.MotivosParada.padrao: False})
            obj.descricao = item.descricao
            obj.classificacao = item.classificacao.value
            obj.padrao = item.padrao
            obj.ativo = item.ativo
        s.commit(); s.refresh(obj)
        return _to_pydantic(pmodels.MotivosParada, obj)


def delete_motivo(id_value: uuid.UUID) -> bool:
    # atomic operation: find default motivo (padrao True) other than target, if none pick another active, then reassign paradas
    with SessionLocal() as s:
        target = s.get(sqm.MotivosParada, str(id_value))
        if not target:
            return False
        # find default
        default = s.query(sqm.MotivosParada).filter(sqm.MotivosParada.padrao == True, sqm.MotivosParada.ativo == True, sqm.MotivosParada.id != str(id_value)).first()
        if not default:
            # pick any other active motivo
            default = s.query(sqm.MotivosParada).filter(sqm.MotivosParada.ativo == True, sqm.MotivosParada.id != str(id_value)).first()
        if not default:
            # cannot reassign; abort
            return False
        try:
            # start transaction
            # reassign paradas
            s.query(sqm.Parada).filter(sqm.Parada.motivo == str(id_value)).update({sqm.Parada.motivo: default.id})
            # mark target inactive
            target.ativo = False
            # ensure only default has padrao True
            s.query(sqm.MotivosParada).update({sqm.MotivosParada.padrao: False})
            default.padrao = True
            s.commit()
            return True
        except Exception:
            s.rollback(); raise


def list_motivos() -> List[pmodels.MotivosParada]:
    with SessionLocal() as s:
        rows = s.query(sqm.MotivosParada).all()
        return [_to_pydantic(pmodels.MotivosParada, r) for r in rows]

# LocalParada delete (similar behavior)
def upsert_local(item: pmodels.LocalParada) -> pmodels.LocalParada:
    with SessionLocal() as s:
        obj = s.get(sqm.LocalParada, str(item.id)) if item.id else None
        if obj is None:
            obj = sqm.LocalParada(id=str(item.id or uuid.uuid4()), descricao=item.descricao, padrao=item.padrao, ativo=item.ativo)
            s.add(obj)
        else:
            if item.padrao:
                s.query(sqm.LocalParada).update({sqm.LocalParada.padrao: False})
            obj.descricao = item.descricao
            obj.padrao = item.padrao
            obj.ativo = item.ativo
        s.commit(); s.refresh(obj); return _to_pydantic(pmodels.LocalParada, obj)


def list_locais() -> List[pmodels.LocalParada]:
    with SessionLocal() as s:
        rows = s.query(sqm.LocalParada).all()
        return [_to_pydantic(pmodels.LocalParada, r) for r in rows]

def delete_local(id_value: uuid.UUID) -> bool:
    with SessionLocal() as s:
        target = s.get(sqm.LocalParada, str(id_value))
        if not target: return False
        default = s.query(sqm.LocalParada).filter(sqm.LocalParada.padrao == True, sqm.LocalParada.ativo == True, sqm.LocalParada.id != str(id_value)).first()
        if not default:
            default = s.query(sqm.LocalParada).filter(sqm.LocalParada.ativo == True, sqm.LocalParada.id != str(id_value)).first()
        if not default:
            return False
        try:
            s.query(sqm.Parada).filter(sqm.Parada.local_parada == str(id_value)).update({sqm.Parada.local_parada: default.id})
            target.ativo = False
            s.query(sqm.LocalParada).update({sqm.LocalParada.padrao: False})
            default.padrao = True
            s.commit(); return True
        except Exception:
            s.rollback(); raise

# Parada CRUD
def upsert_parada(item: pmodels.Parada) -> pmodels.Parada:
    with SessionLocal() as s:
        obj = s.get(sqm.Parada, str(item.id)) if item.id else None
        extr_list = item.extratores_parados
        extr_json = json.dumps([str(x) for x in extr_list]) if extr_list else None
        if obj is None:
            obj = sqm.Parada(id=str(item.id or uuid.uuid4()), extrator_id=str(item.extrator_id), motivo=str(item.motivo), duracao_minutos=item.duracao_minutos, local_parada=str(item.local_parada), extratores_parados=extr_json, ativo=item.ativo)
            s.add(obj)
        else:
            obj.extrator_id = str(item.extrator_id)
            obj.motivo = str(item.motivo)
            obj.duracao_minutos = item.duracao_minutos
            obj.local_parada = str(item.local_parada)
            obj.extratores_parados = extr_json
            obj.ativo = item.ativo
        s.commit(); s.refresh(obj); return _to_pydantic(pmodels.Parada, obj)


def delete_parada(id_value: uuid.UUID) -> bool:
    with SessionLocal() as s:
        obj = s.get(sqm.Parada, str(id_value))
        if not obj: return False
        obj.ativo = False
        s.commit(); return True


def list_paradas() -> List[pmodels.Parada]:
    with SessionLocal() as s:
        rows = s.query(sqm.Parada).all(); return [_to_pydantic(pmodels.Parada, r) for r in rows]


def search_paradas_by_motivo(substr: str) -> List[pmodels.Parada]:
    with SessionLocal() as s:
        q = s.query(sqm.Parada).filter(func.lower(sqm.Parada.motivo).contains(substr.lower()))
        return [_to_pydantic(pmodels.Parada, r) for r in q.all()]

# Horimetro CRUD
def upsert_horimetro(item: pmodels.Horimetro) -> pmodels.Horimetro:
    with SessionLocal() as s:
        obj = s.get(sqm.Horimetro, str(item.id)) if item.id else None
        if obj is None:
            obj = sqm.Horimetro(id=str(item.id or uuid.uuid4()), extrator_id=str(item.extrator_id), turno=item.turno.value, minutos_trabalhados=item.minutos_trabalhados, observacoes=item.observacoes)
            s.add(obj)
        else:
            obj.extrator_id = str(item.extrator_id)
            obj.turno = item.turno.value
            obj.minutos_trabalhados = item.minutos_trabalhados
            obj.observacoes = item.observacoes
        s.commit(); s.refresh(obj); return _to_pydantic(pmodels.Horimetro, obj)


def delete_horimetro(id_value: uuid.UUID) -> bool:
    with SessionLocal() as s:
        obj = s.get(sqm.Horimetro, str(id_value))
        if not obj: return False
        s.delete(obj); s.commit(); return True


def list_horimetros() -> List[pmodels.Horimetro]:
    with SessionLocal() as s:
        rows = s.query(sqm.Horimetro).all(); return [_to_pydantic(pmodels.Horimetro, r) for r in rows]


# FeedBack CRUD
def upsert_feedback(item: pmodels.FeedBackProducao) -> pmodels.FeedBackProducao:
    with SessionLocal() as s:
        obj = s.get(sqm.FeedBackProducao, str(item.id)) if item.id else None
        if obj is None:
            obj = sqm.FeedBackProducao(id=str(item.id or uuid.uuid4()), produto=item.produto.value, tamanho_da_fruta=item.tamanho_da_fruta, caixas_processadas=item.caixas_processadas, dia=item.dia)
            s.add(obj)
        else:
            obj.produto = item.produto.value
            obj.tamanho_da_fruta = item.tamanho_da_fruta
            obj.caixas_processadas = item.caixas_processadas
            obj.dia = item.dia
        s.commit(); s.refresh(obj); return _to_pydantic(pmodels.FeedBackProducao, obj)


def delete_feedback(id_value: uuid.UUID) -> bool:
    with SessionLocal() as s:
        obj = s.get(sqm.FeedBackProducao, str(id_value))
        if not obj: return False
        s.delete(obj); s.commit(); return True


def list_feedbacks() -> List[pmodels.FeedBackProducao]:
    with SessionLocal() as s:
        rows = s.query(sqm.FeedBackProducao).all(); return [_to_pydantic(pmodels.FeedBackProducao, r) for r in rows]

