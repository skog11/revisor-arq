-- Grafo de relaciones entre normas del corpus de REVISOR ARQ.
-- Cada fila representa una arista dirigida: norma_origen → norma_destino.
CREATE TABLE IF NOT EXISTS norm_relations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norma_origen  uuid NOT NULL REFERENCES normas(id) ON DELETE CASCADE,
  norma_destino uuid NOT NULL REFERENCES normas(id) ON DELETE CASCADE,
  tipo_relacion text NOT NULL CHECK (tipo_relacion IN (
    'modifica',
    'complementa',
    'deroga',
    'remite_a',
    'reglamento_de',
    'desarrolla'
  )),
  articulos_afectados text[]  DEFAULT '{}',
  descripcion         text,
  verificado          boolean DEFAULT false,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_norm_relations_origen  ON norm_relations(norma_origen);
CREATE INDEX IF NOT EXISTS idx_norm_relations_destino ON norm_relations(norma_destino);
CREATE INDEX IF NOT EXISTS idx_norm_relations_tipo    ON norm_relations(tipo_relacion);

CREATE UNIQUE INDEX IF NOT EXISTS idx_norm_relations_unique
  ON norm_relations(norma_origen, norma_destino, tipo_relacion);

COMMENT ON TABLE norm_relations IS
  'Grafo de relaciones entre normas. Arista (A→B, tipo): A tiene esa relación con B.';

-- Semilla: OGUC es reglamento de la LGUC
INSERT INTO norm_relations (norma_origen, norma_destino, tipo_relacion, descripcion, verificado)
SELECT o.id, d.id, 'reglamento_de', 'La OGUC es el reglamento de la LGUC', true
FROM normas o, normas d
WHERE o.tipo = 'OGUC' AND d.tipo = 'LGUC'
ON CONFLICT DO NOTHING;

-- Semilla: DS 50/2016 MINVU modifica OGUC en materia de accesibilidad
INSERT INTO norm_relations (norma_origen, norma_destino, tipo_relacion, articulos_afectados, descripcion, verificado)
SELECT
  o.id, d.id, 'modifica',
  ARRAY['2.2.1','2.2.2','4.1.6','4.1.7','4.1.10','4.2.1','4.3.1'],
  'DS 50/2016 MINVU modifica OGUC en materia de accesibilidad universal',
  true
FROM normas o, normas d
WHERE o.numero = '50/2016 MINVU' AND d.tipo = 'OGUC'
ON CONFLICT DO NOTHING;

-- Semilla: DS 50/2016 es desarrollo de Ley 20.422 (inclusión)
INSERT INTO norm_relations (norma_origen, norma_destino, tipo_relacion, descripcion, verificado)
SELECT o.id, d.id, 'desarrolla', 'DS 50/2016 desarrolla la Ley 20.422 en el ámbito de edificación', true
FROM normas o, normas d
WHERE o.numero = '50/2016 MINVU' AND d.numero = '20.422'
ON CONFLICT DO NOTHING;
