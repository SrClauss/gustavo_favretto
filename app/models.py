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
    
    # Relações
    paradas = relationship('Parada', secondary='extratores_parados', back_populates='extratores')
    horimetros = relationship('Horimetro', back_populates='extrator')


class MotivosParada(Base):
    __tablename__ = 'motivos_parada'
    id = Column(String(36), primary_key=True)
    descricao = Column(String, nullable=False, index=True)
    classificacao = Column(SAEnum('Disponibilidade','Performance','Qualidade', name='classificacao_parada'), nullable=False)
    padrao = Column(Boolean, default=False, nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    
    # Relação inversa
    paradas = relationship('Parada', back_populates='motivo_rel')


class LocalParada(Base):
    __tablename__ = 'local_parada'
    id = Column(String(36), primary_key=True)
    descricao = Column(String, nullable=False, index=True)
    padrao = Column(Boolean, default=False, nullable=False)
    ativo = Column(Boolean, default=True, nullable=False)
    
    # Relação inversa
    paradas = relationship('Parada', back_populates='local_rel')


class Parada(Base):
    __tablename__ = 'paradas'
    id = Column(String(36), primary_key=True)
    data = Column(Date, nullable=False, index=True)
    motivo = Column(String(36), ForeignKey('motivos_parada.id'), nullable=False, index=True)
    hora_inicio = Column(String(5), nullable=False)  # HH:MM
    hora_fim = Column(String(5), nullable=False)    # HH:MM
    local_parada = Column(String(36), ForeignKey('local_parada.id'), nullable=True, index=True)
    observacoes = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    
    # Relações
    extratores = relationship('Extrator', secondary='extratores_parados', back_populates='paradas')
    extratores_parados_rel = relationship('ExtratorParado', backref='parada')
    motivo_rel = relationship('MotivosParada', back_populates='paradas')
    local_rel = relationship('LocalParada', back_populates='paradas')


class ExtratorParado(Base):
    __tablename__ = 'extratores_parados'
    id = Column(String(36), primary_key=True)
    parada_id = Column(String(36), ForeignKey('paradas.id'), nullable=False, index=True)
    extrator_id = Column(String(36), ForeignKey('extratores.id'), nullable=False, index=True)

class Horimetro(Base):
    __tablename__ = 'horimetro'
    id = Column(String(36), primary_key=True)
    extrator_id = Column(String(36), ForeignKey('extratores.id'), nullable=False, index=True)
    data = Column(Date, nullable=False, index=True)
    turno = Column(String, nullable=False, index=True)
    observacoes = Column(Text, nullable=True)
    valor = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    __table_args__ = (
        UniqueConstraint('extrator_id', 'data', 'turno', name='uq_horimetro_extrator_data_turno'),
    )
    
    # Relação
    extrator = relationship('Extrator', back_populates='horimetros')


class FeedBackProducao(Base):
    __tablename__ = 'feedback_producao'
    id = Column(String(36), primary_key=True)
    data = Column(Date, nullable=False, index=True)
    produto = Column(String, nullable=False, index=True)
    tamanho_da_fruta = Column(Float, nullable=False)
    caixas_processadas = Column(Integer, nullable=False)
