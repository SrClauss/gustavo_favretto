from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class Turnos(str, Enum):
    TURNO_1 = "06:00 - 14:00"
    TURNO_2 = "14:00 - 22:00"
    TURNO_3 = "22:00 - 06:00"


class ClassificacaoParada(str, Enum):
    DISPONIBILIDADE = 'Disponibilidade'
    PERFORMANCE = 'Performance'
    QUALIDADE = 'Qualidade'

class Extrator(BaseModel):
    id: Optional[str]
    numero: int
    modelo: str
    ativo: bool = True

class MotivosParada(BaseModel):
    id: Optional[str]
    descricao: str
    classificacao: ClassificacaoParada
    padrao: bool = False
    ativo: bool = True

class LocalParada(BaseModel):
    id: Optional[str]
    descricao: str
    padrao: bool = False
    ativo: bool = True

class Parada(BaseModel):
    id: Optional[str]
    data: str
    motivo: str
    hora_inicio: str
    hora_fim: str
    local_parada: Optional[str]
    observacoes: Optional[str]
    extratores_parados: List[str] = []
    ativo: bool = True

class Horimetro(BaseModel):
    id: Optional[str]
    extrator_id: str
    data: str
    turno: Turnos
    minutos_trabalhados: int
    observacoes: Optional[str]

class FeedBackProducao(BaseModel):
    id: Optional[str]
    data: str
    produto: str
    tamanho_da_fruta: float
    caixas_processadas: int