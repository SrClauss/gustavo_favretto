from sqlalchemy import Column, String, Integer, Boolean, JSON, Date, DateTime, UniqueConstraint, Float, ForeignKey
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .db import Base


class Extrator(Base):
    __tablename__ = 'extratores'
    id = Column(String(36), primary_key=True)
    numero = Column(Integer, nullable=False)
    modelo = Column(String, nullable=False, index=True)
    ativo = Column(Boolean, default=True, nullable=False)


class MotivosParada(Base):
    __tablename__ = 'motivos_parada'
    id = Column(String(36), primary_key=True)
    descricao = Column(String, nullable=False, index=True)
    classificacao = Column(String, nullable=False)
    padrao = Column(Boolean, default=False, nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)


class LocalParada(Base):
    __tablename__ = 'local_parada'
    id = Column(String(36), primary_key=True)
    descricao = Column(String, nullable=False, index=True)
    padrao = Column(Boolean, default=False, nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)


class Parada(Base):
    __tablename__ = 'paradas'
    id = Column(String(36), primary_key=True)
    extrator_id = Column(String(36), nullable=False, index=True)
    data = Column(Date, nullable=False, index=True)
    turno = Column(String, nullable=False, index=True)
    motivo = Column(String(36), nullable=False, index=True)
    duracao_minutos = Column(Integer, nullable=False)
    local_parada = Column(String(36), nullable=True, index=True)
    ativo = Column(Boolean, default=True, nullable=False)


class ParadaExtrator(Base):
    __tablename__ = 'parada_extrator'
    id = Column(String(36), primary_key=True)
    parada_id = Column(String(36), ForeignKey('paradas.id'), nullable=False, index=True)
    extrator_id = Column(String(36), ForeignKey('extratores.id'), nullable=False, index=True)
    
    __table_args__ = (
        UniqueConstraint('parada_id', 'extrator_id', name='uq_parada_extrator'),
    )


class Horimetro(Base):
    __tablename__ = 'horimetro'
    id = Column(String(36), primary_key=True)
    extrator_id = Column(String(36), nullable=False, index=True)
    data = Column(Date, nullable=False, index=True)
    turno = Column(String, nullable=False, index=True)
    observacoes = Column(Text, nullable=True)
    valor = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('extrator_id', 'data', 'turno', name='uq_horimetro_extrator_data_turno'),
    )


class FeedBackProducao(Base):
    __tablename__ = 'feedback_producao'
    id = Column(String(36), primary_key=True)
    extrator_id = Column(String(36), nullable=False, index=True)
    data = Column(Date, nullable=False, index=True)
    turno = Column(String, nullable=False, index=True)
    produto = Column(String, nullable=False, index=True)
    tamanho_da_fruta = Column(Integer, nullable=False)
    caixas_processadas = Column(Integer, nullable=False)
