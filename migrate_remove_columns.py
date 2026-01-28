"""
Database migration script to:
1. Remove turno column from paradas table
2. Remove extrator_id and turno columns from feedback_producao table
3. Update unique constraints
"""
import sqlite3
import sys
import os

# Get database path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_FILE = os.path.join(DATA_DIR, 'controle.db')

print(f"Migrating database: {DB_FILE}")

conn = sqlite3.connect(DB_FILE)
cursor = conn.cursor()

try:
    # Step 1: Backup existing paradas data
    print("Backing up paradas data...")
    cursor.execute("SELECT id, extrator_id, data, motivo, duracao_minutos, local_parada, ativo FROM paradas")
    paradas_backup = cursor.fetchall()
    
    # Step 2: Recreate paradas table without turno column
    print("Recreating paradas table without turno column...")
    cursor.execute("DROP TABLE IF EXISTS paradas_new")
    cursor.execute("""
        CREATE TABLE paradas_new (
            id VARCHAR(36) PRIMARY KEY,
            extrator_id VARCHAR(36) NOT NULL,
            data DATE NOT NULL,
            motivo VARCHAR(36) NOT NULL,
            duracao_minutos INTEGER NOT NULL,
            local_parada VARCHAR(36),
            ativo BOOLEAN NOT NULL,
            UNIQUE(extrator_id, data, motivo)
        )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX ix_paradas_new_extrator_id ON paradas_new(extrator_id)")
    cursor.execute("CREATE INDEX ix_paradas_new_data ON paradas_new(data)")
    cursor.execute("CREATE INDEX ix_paradas_new_motivo ON paradas_new(motivo)")
    cursor.execute("CREATE INDEX ix_paradas_new_local_parada ON paradas_new(local_parada)")
    
    # Restore data
    print(f"Restoring {len(paradas_backup)} paradas...")
    for parada in paradas_backup:
        cursor.execute("""
            INSERT INTO paradas_new (id, extrator_id, data, motivo, duracao_minutos, local_parada, ativo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, parada)
    
    # Replace old table
    cursor.execute("DROP TABLE paradas")
    cursor.execute("ALTER TABLE paradas_new RENAME TO paradas")
    
    conn.commit()
    print("✓ Paradas table updated")
    
    # Step 3: Backup existing feedback_producao data
    print("\nBacking up feedback_producao data...")
    cursor.execute("SELECT id, data, produto, tamanho_da_fruta, caixas_processadas FROM feedback_producao")
    feedback_backup = cursor.fetchall()
    
    # Step 4: Recreate feedback_producao table without extrator_id and turno
    print("Recreating feedback_producao table without extrator_id and turno...")
    cursor.execute("DROP TABLE IF EXISTS feedback_producao_new")
    cursor.execute("""
        CREATE TABLE feedback_producao_new (
            id VARCHAR(36) PRIMARY KEY,
            data DATE NOT NULL,
            produto VARCHAR NOT NULL,
            tamanho_da_fruta INTEGER NOT NULL,
            caixas_processadas INTEGER NOT NULL,
            UNIQUE(data, produto)
        )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX ix_feedback_producao_new_data ON feedback_producao_new(data)")
    cursor.execute("CREATE INDEX ix_feedback_producao_new_produto ON feedback_producao_new(produto)")
    
    # Restore data
    print(f"Restoring {len(feedback_backup)} feedbacks...")
    for feedback in feedback_backup:
        try:
            cursor.execute("""
                INSERT INTO feedback_producao_new (id, data, produto, tamanho_da_fruta, caixas_processadas)
                VALUES (?, ?, ?, ?, ?)
            """, feedback)
        except sqlite3.IntegrityError:
            # Skip duplicates (same date + produto)
            print(f"  Warning: Skipping duplicate feedback for {feedback[1]} - {feedback[2]}")
    
    # Replace old table
    cursor.execute("DROP TABLE feedback_producao")
    cursor.execute("ALTER TABLE feedback_producao_new RENAME TO feedback_producao")
    
    conn.commit()
    print("✓ Feedback_producao table updated")
    
    print("\nMigration completed successfully!")
    
except Exception as e:
    print(f"\nError during migration: {e}")
    conn.rollback()
    sys.exit(1)
finally:
    conn.close()
