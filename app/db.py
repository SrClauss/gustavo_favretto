import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

DB_FILE = os.path.join(DATA_DIR, 'controle.db')
SQLITE_URL = f"sqlite:///{DB_FILE}"

engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False}, echo=False)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def create_database_if_not_exists():
    """Cria o banco de dados e tabelas se não existirem"""
    if not os.path.exists(DB_FILE):
        print(f"Criando banco de dados em {DB_FILE}")
        # Para SQLite, o arquivo é criado ao conectar, então apenas criar as tabelas
        Base.metadata.create_all(bind=engine)
    else:
        # Mesmo se existir, garantir que as tabelas estejam criadas (para novas migrações)
        Base.metadata.create_all(bind=engine)
