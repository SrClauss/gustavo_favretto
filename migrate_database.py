"""
Database migration script to:
1. Add data and turno columns to paradas table
2. Create parada_extrator table for many-to-many relation
3. Migrate extratores_parados data from paradas to parada_extrator
4. Add extrator_id, data, and turno columns to feedback_producao
5. Remove extratores_parados column from paradas
"""
import sqlite3
import json
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
    # Step 1: Check if paradas table has data and turno columns
    cursor.execute("PRAGMA table_info(paradas)")
    columns = {row[1] for row in cursor.fetchall()}
    
    needs_paradas_migration = 'data' not in columns or 'turno' not in columns
    has_extratores_parados = 'extratores_parados' in columns
    
    if needs_paradas_migration:
        print("Adding data and turno columns to paradas table...")
        
        # Add data column (default to today for existing records)
        if 'data' not in columns:
            cursor.execute("ALTER TABLE paradas ADD COLUMN data DATE")
            cursor.execute("UPDATE paradas SET data = date('now') WHERE data IS NULL")
            print("  - Added data column")
        
        # Add turno column (default to first shift for existing records)
        if 'turno' not in columns:
            cursor.execute("ALTER TABLE paradas ADD COLUMN turno VARCHAR")
            cursor.execute("UPDATE paradas SET turno = '06:00 - 14:00' WHERE turno IS NULL")
            print("  - Added turno column")
        
        conn.commit()
    else:
        print("Paradas table already has data and turno columns")
    
    # Step 2: Create parada_extrator table if it doesn't exist
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS parada_extrator (
            id VARCHAR(36) PRIMARY KEY,
            parada_id VARCHAR(36) NOT NULL,
            extrator_id VARCHAR(36) NOT NULL,
            FOREIGN KEY (parada_id) REFERENCES paradas(id),
            FOREIGN KEY (extrator_id) REFERENCES extratores(id),
            UNIQUE (parada_id, extrator_id)
        )
    """)
    
    # Create indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_parada_extrator_parada_id ON parada_extrator(parada_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_parada_extrator_extrator_id ON parada_extrator(extrator_id)")
    
    print("Created parada_extrator table")
    conn.commit()
    
    # Step 3: Migrate extratores_parados data if the column exists
    if has_extratores_parados:
        print("Migrating extratores_parados data to parada_extrator table...")
        
        cursor.execute("SELECT id, extratores_parados FROM paradas WHERE extratores_parados IS NOT NULL")
        paradas_with_extratores = cursor.fetchall()
        
        import uuid
        migrated_count = 0
        
        for parada_id, extratores_parados_json in paradas_with_extratores:
            try:
                extratores_ids = json.loads(extratores_parados_json)
                for extrator_id in extratores_ids:
                    # Check if relation already exists
                    cursor.execute(
                        "SELECT id FROM parada_extrator WHERE parada_id = ? AND extrator_id = ?",
                        (parada_id, extrator_id)
                    )
                    if not cursor.fetchone():
                        new_id = str(uuid.uuid4())
                        cursor.execute(
                            "INSERT INTO parada_extrator (id, parada_id, extrator_id) VALUES (?, ?, ?)",
                            (new_id, parada_id, extrator_id)
                        )
                        migrated_count += 1
            except (json.JSONDecodeError, TypeError) as e:
                print(f"  Warning: Could not parse extratores_parados for parada {parada_id}: {e}")
        
        print(f"  - Migrated {migrated_count} parada-extrator relations")
        conn.commit()
    
    # Step 4: Update feedback_producao table
    cursor.execute("PRAGMA table_info(feedback_producao)")
    fb_columns = {row[1] for row in cursor.fetchall()}
    
    needs_fb_migration = False
    
    # Check if we need to add extrator_id, data, turno columns
    if 'extrator_id' not in fb_columns:
        print("Adding extrator_id to feedback_producao...")
        cursor.execute("ALTER TABLE feedback_producao ADD COLUMN extrator_id VARCHAR(36)")
        needs_fb_migration = True
    
    if 'data' not in fb_columns and 'dia' in fb_columns:
        print("Renaming dia to data in feedback_producao...")
        # SQLite doesn't support column rename directly, need to recreate table
        cursor.execute("""
            CREATE TABLE feedback_producao_new (
                id VARCHAR(36) PRIMARY KEY,
                extrator_id VARCHAR(36) NOT NULL,
                data DATE NOT NULL,
                turno VARCHAR NOT NULL,
                produto VARCHAR NOT NULL,
                tamanho_da_fruta INTEGER NOT NULL,
                caixas_processadas INTEGER NOT NULL
            )
        """)
        
        # Copy existing data if any
        cursor.execute("SELECT COUNT(*) FROM feedback_producao")
        if cursor.fetchone()[0] > 0:
            cursor.execute("""
                INSERT INTO feedback_producao_new (id, produto, tamanho_da_fruta, caixas_processadas, data)
                SELECT id, produto, tamanho_da_fruta, caixas_processadas, dia FROM feedback_producao
            """)
        
        cursor.execute("DROP TABLE feedback_producao")
        cursor.execute("ALTER TABLE feedback_producao_new RENAME TO feedback_producao")
        
        # Recreate indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_feedback_producao_produto ON feedback_producao(produto)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_feedback_producao_extrator_id ON feedback_producao(extrator_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_feedback_producao_data ON feedback_producao(data)")
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_feedback_producao_turno ON feedback_producao(turno)")
        
        needs_fb_migration = True
    elif 'turno' not in fb_columns:
        print("Adding turno to feedback_producao...")
        cursor.execute("ALTER TABLE feedback_producao ADD COLUMN turno VARCHAR")
        needs_fb_migration = True
    
    if needs_fb_migration:
        conn.commit()
        print("Updated feedback_producao table structure")
    else:
        print("feedback_producao table structure is up to date")
    
    # Step 5: Remove extratores_parados column from paradas (optional, kept for backwards compatibility)
    # Commented out to maintain backwards compatibility
    # if has_extratores_parados:
    #     print("Note: extratores_parados column kept for backwards compatibility")
    
    print("\nMigration completed successfully!")
    
except Exception as e:
    print(f"\nError during migration: {e}")
    conn.rollback()
    sys.exit(1)
finally:
    conn.close()
