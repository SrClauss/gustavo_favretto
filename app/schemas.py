from enum import Enum
from pydantic import BaseModel
import uuid


class Classificacao(str, Enum):
    DISPONIBILIDADE = "Disponibilidade"
    PERFORMANCE = "Performance"


class Turnos(str, Enum):
    TURNO_1 = "06:00 - 14:00"
    TURNO_2 = "14:00 - 22:00"
    TURNO_3 = "22:00 - 06:00"


class TurnoDia(BaseModel):
    id: uuid.UUID
    turno: Turnos
    dia: str
    


class Produto(str, Enum):
    ORANGE = "Orange"
    LIME = "Lime"
    LEMON = "Lemon"
    TANGERINE = "Tangerine"


class Extrator(BaseModel):
    id: uuid.UUID
    numero: int
    modelo: str
    ativo: bool = True

    class Config:
        orm_mode = True


class Parada(BaseModel):
    id: uuid.UUID    
    extrator_id: uuid.UUID
    data: str  # formato YYYY-MM-DD
    motivo: uuid.UUID
    duracao_minutos: int
    local_parada: uuid.UUID
    extratores_parados: list[uuid.UUID] = []
    ativo: bool = True

    class Config:
        orm_mode = True




class MotivosParada(BaseModel):
    id: uuid.UUID
    descricao: str
    classificacao: Classificacao
    padrao: bool = False
    ativo: bool = True

    class Config:
        orm_mode = True



class Horimetro(BaseModel):
    id: uuid.UUID
    extrator_id: uuid.UUID
    data: str  # formato YYYY-MM-DD
    turno: Turnos
    valor: float
    created_at: str | None = None

    class Config:
        orm_mode = True


class LocalParada(BaseModel):
    id: uuid.UUID
    descricao: str
    padrao: bool = False
    ativo: bool = True

    class Config:
        orm_mode = True



class FeedBackProducao(BaseModel):
    id: uuid.UUID
    data: str  # formato YYYY-MM-DD
    produto: Produto
    tamanho_da_fruta: int
    caixas_processadas: int

    class Config:
        orm_mode = True

