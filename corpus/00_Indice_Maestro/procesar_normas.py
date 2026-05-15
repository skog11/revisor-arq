"""
Script para procesar normativa chilena - REVISOR ARQ
Genera estructura de carpetas, metadatos y archivos de registro para cada norma.
"""

import os
import json
from datetime import datetime

BASE_PATH = r"C:/00_CLAUDE CODE/REVISOR-ARQ/NORMATIVA/Normativa_CHILE"

# Listado completo de normas
NORMAS = [
    # 1) Medio ambiente e institucionalidad ambiental
    # 1.1 Marco general
    {"id": "01-01-001", "categoria": "01_Medio_Ambiente_e_Institucionalidad_Ambiental", "subcategoria": "01_01_Marco_General", "tipo": "Ley", "numero": "19300", "anio": "1994", "organismo": "BCN", "titulo": "Aprueba la Ley sobre Bases Generales del Medio Ambiente", "nombre_corto": "Bases_Generales_Medio_Ambiente", "url": "https://www.bcn.cl/leychile/navega?idNorma=30312", "fuente": "LeyChile/BCN"},
    {"id": "01-01-002", "categoria": "01_Medio_Ambiente_e_Institucionalidad_Ambiental", "subcategoria": "01_01_Marco_General", "tipo": "Ley", "numero": "20417", "anio": "2010", "organismo": "BCN", "titulo": "Crea el Ministerio del Medio Ambiente, el Servicio de Evaluación Ambiental y la Superintendencia del Medio Ambiente", "nombre_corto": "Crea_MMA_SEA_SMA", "url": "https://www.bcn.cl/leychile/navega?idNorma=31387", "fuente": "LeyChile/BCN"},
    {"id": "01-01-003", "categoria": "01_Medio_Ambiente_e_Institucionalidad_Ambiental", "subcategoria": "01_01_Marco_General", "tipo": "Ley", "numero": "20600", "anio": "2012", "organismo": "BCN", "titulo": "Crea los Tribunales Ambientales", "nombre_corto": "Crea_Tribunales_Ambientales", "url": "https://www.bcn.cl/leychile/navega?idNorma=103165", "fuente": "LeyChile/BCN"},

    # 1.2 Evaluación ambiental
    {"id": "01-02-001", "categoria": "01_Medio_Ambiente_e_Institucionalidad_Ambiental", "subcategoria": "01_02_Evaluacion_Ambiental", "tipo": "Decreto_Supremo", "numero": "40", "anio": "2012", "organismo": "MMA", "titulo": "Reglamento del Sistema de Evaluación de Impacto Ambiental (SEIA)", "nombre_corto": "Reglamento_SEIA", "url": "https://mma.gob.cl/", "fuente": "MMA"},
    {"id": "01-02-002", "categoria": "01_Medio_Ambiente_e_Institucionalidad_Ambiental", "subcategoria": "01_02_Evaluacion_Ambiental", "tipo": "Decreto_Supremo", "numero": "30", "anio": "2023", "organismo": "MMA", "titulo": "Modifica el Reglamento del SEIA", "nombre_corto": "Modifica_Reglamento_SEIA", "url": "https://mma.gob.cl/", "fuente": "MMA"},

    # 1.3 Emisiones, ruido y residuos
    {"id": "01-03-001", "categoria": "01_Medio_Ambiente_e_Institucionalidad_Ambiental", "subcategoria": "01_03_Emisiones_Ruido_y_Residuos", "tipo": "Decreto_Supremo", "numero": "38", "anio": "2011", "organismo": "MMA", "titulo": "Norma de emisión de ruidos generados por fuentes fijas", "nombre_corto": "Norma_Emision_Ruidos", "url": "https://mma.gob.cl/", "fuente": "MMA"},
    {"id": "01-03-002", "categoria": "01_Medio_Ambiente_e_Institucionalidad_Ambiental", "subcategoria": "01_03_Emisiones_Ruido_y_Residuos", "tipo": "Decreto_Supremo", "numero": "38", "anio": "2012", "organismo": "MMA", "titulo": "Reglamento para la dictación de normas de calidad ambiental y de emisión", "nombre_corto": "Reglamento_Normas_Calidad_Emision", "url": "https://mma.gob.cl/", "fuente": "MMA"},
    {"id": "01-03-003", "categoria": "01_Medio_Ambiente_e_Institucionalidad_Ambiental", "subcategoria": "01_03_Emisiones_Ruido_y_Residuos", "tipo": "Ley", "numero": "20920", "anio": "2016", "organismo": "BCN", "titulo": "Establece marco para la gestión de residuos, responsabilidad extendida del productor y fomento al reciclaje", "nombre_corto": "Ley_Reciclaje", "url": "https://www.bcn.cl/leychile/navega?idNorma=109123", "fuente": "LeyChile/BCN"},

    # 2) Sanitario, seguridad y residuos peligrosos
    # 2.1 Base sanitaria general
    {"id": "02-01-001", "categoria": "02_Sanitario_Seguridad_y_Residuos_Peligrosos", "subcategoria": "02_01_Base_Sanitaria_General", "tipo": "DFL", "numero": "725", "anio": "1967", "organismo": "MINSAL", "titulo": "Código Sanitario", "nombre_corto": "Codigo_Sanitario", "url": "https://www.bcn.cl/leychile/navega?idNorma=6660", "fuente": "LeyChile/BCN"},

    # 2.2 Lugares de trabajo y seguridad ocupacional
    {"id": "02-02-001", "categoria": "02_Sanitario_Seguridad_y_Residuos_Peligrosos", "subcategoria": "02_02_Lugares_de_Trabajo_y_Seguridad_Ocupacional", "tipo": "Decreto_Supremo", "numero": "594", "anio": "1999", "organismo": "MINSAL", "titulo": "Reglamento sobre condiciones sanitarias y ambientales básicas en los lugares de trabajo", "nombre_corto": "Condiciones_Sanitarias_Lugares_Trabajo", "url": "https://www.bcn.cl/leychile/navega?idNorma=12869", "fuente": "LeyChile/BCN"},
    {"id": "02-02-002", "categoria": "02_Sanitario_Seguridad_y_Residuos_Peligrosos", "subcategoria": "02_02_Lugares_de_Trabajo_y_Seguridad_Ocupacional", "tipo": "Ley", "numero": "16744", "anio": "1968", "organismo": "BCN", "titulo": "Establece normas sobre accidentes del trabajo y enfermedades profesionales", "nombre_corto": "Accidentes_Trabajo_Enfermedades_Profesionales", "url": "https://www.bcn.cl/leychile/navega?idNorma=6623", "fuente": "LeyChile/BCN"},
    {"id": "02-02-003", "categoria": "02_Sanitario_Seguridad_y_Residuos_Peligrosos", "subcategoria": "02_02_Lugares_de_Trabajo_y_Seguridad_Ocupacional", "tipo": "Decreto", "numero": "109", "anio": "1968", "organismo": "MinTrabajo", "titulo": "Reglamento de la Ley 16.744", "nombre_corto": "Reglamento_Ley_16744", "url": "https://www.bcn.cl/leychile/navega?idNorma=6624", "fuente": "LeyChile/BCN"},

    # 2.3 Residuos peligrosos
    {"id": "02-03-001", "categoria": "02_Sanitario_Seguridad_y_Residuos_Peligrosos", "subcategoria": "02_03_Residuos_Peligrosos", "tipo": "Decreto_Supremo", "numero": "148", "anio": "2003", "organismo": "MINSAL", "titulo": "Reglamento para el manejo de residuos peligrosos", "nombre_corto": "Manejo_Residuos_Peligrosos", "url": "https://www.bcn.cl/leychile/navega?idNorma=23065", "fuente": "LeyChile/BCN"},

    # 3) Agua, servicios sanitarios y drenaje
    # 3.1 Recursos hídricos
    {"id": "03-01-001", "categoria": "03_Agua_Servicios_Sanitarios_y_Drenaje", "subcategoria": "03_01_Recursos_Hidricos", "tipo": "DFL", "numero": "1122", "anio": "1981", "organismo": "MOP", "titulo": "Código de Aguas", "nombre_corto": "Codigo_de_Aguas", "url": "https://www.bcn.cl/leychile/navega?idNorma=6695", "fuente": "LeyChile/BCN"},
    {"id": "03-01-002", "categoria": "03_Agua_Servicios_Sanitarios_y_Drenaje", "subcategoria": "03_01_Recursos_Hidricos", "tipo": "Ley", "numero": "21435", "anio": "2022", "organismo": "BCN", "titulo": "Reforma el Código de Aguas", "nombre_corto": "Reforma_Codigo_Aguas", "url": "https://www.bcn.cl/leychile/navega?idNorma=117575", "fuente": "LeyChile/BCN"},
    {"id": "03-01-003", "categoria": "03_Agua_Servicios_Sanitarios_y_Drenaje", "subcategoria": "03_01_Recursos_Hidricos", "tipo": "Ley", "numero": "21586", "anio": "2023", "organismo": "BCN", "titulo": "Modifica la Ley 21.435 y el Código de Aguas", "nombre_corto": "Modifica_Ley_21435_Codigo_Aguas", "url": "https://www.bcn.cl/leychile/navega?idNorma=119452", "fuente": "LeyChile/BCN"},

    # 3.2 Servicios sanitarios
    {"id": "03-02-001", "categoria": "03_Agua_Servicios_Sanitarios_y_Drenaje", "subcategoria": "03_02_Servicios_Sanitarios", "tipo": "DFL", "numero": "382", "anio": "1988", "organismo": "MOP", "titulo": "Ley General de Servicios Sanitarios", "nombre_corto": "Ley_Gral_Servicios_Sanitarios", "url": "https://www.bcn.cl/leychile/navega?idNorma=29596", "fuente": "LeyChile/BCN"},
    {"id": "03-02-002", "categoria": "03_Agua_Servicios_Sanitarios_y_Drenaje", "subcategoria": "03_02_Servicios_Sanitarios", "tipo": "Decreto_Supremo", "numero": "1199", "anio": "2004", "organismo": "MOP", "titulo": "Reglamento de la Ley General de Servicios Sanitarios", "nombre_corto": "Reglamento_LGSS", "url": "https://www.mop.cl/", "fuente": "MOP"},
    {"id": "03-02-003", "categoria": "03_Agua_Servicios_Sanitarios_y_Drenaje", "subcategoria": "03_02_Servicios_Sanitarios", "tipo": "Decreto_Supremo", "numero": "50", "anio": "2002", "organismo": "MOP", "titulo": "Reglamento de la Industria de Agua y Alcantarillado (RIDAA)", "nombre_corto": "RIDAA", "url": "https://www.mop.cl/", "fuente": "MOP"},

    # 3.3 Aguas lluvias
    {"id": "03-03-001", "categoria": "03_Agua_Servicios_Sanitarios_y_Drenaje", "subcategoria": "03_03_Aguas_Lluvias", "tipo": "Ley", "numero": "19525", "anio": "1997", "organismo": "BCN", "titulo": "Sistemas de evacuación y drenaje de aguas lluvias", "nombre_corto": "Evacuacion_Drenaje_Aguas_Lluvias", "url": "https://www.bcn.cl/leychile/navega?idNorma=60674", "fuente": "LeyChile/BCN"},

    # 3.4 Descargas líquidas
    {"id": "03-04-001", "categoria": "03_Agua_Servicios_Sanitarios_y_Drenaje", "subcategoria": "03_04_Descargas_Liquidas", "tipo": "Decreto_Supremo", "numero": "90", "anio": "2000", "organismo": "Minsegpres", "titulo": "Norma de emisión para la regulación de contaminantes asociados a las descargas líquidas a las aguas marinas y continentales superficiales", "nombre_corto": "Norma_Emision_Descargas_Liquidas", "url": "https://mma.gob.cl/", "fuente": "MMA"},

    # 4) Patrimonio, arqueología y hallazgos
    {"id": "04-01-001", "categoria": "04_Patrimonio_Arqueologia_y_Hallazgos", "subcategoria": "", "tipo": "Ley", "numero": "17288", "anio": "1970", "organismo": "BCN", "titulo": "Ley de Monumentos Nacionales", "nombre_corto": "Monumentos_Nacionales", "url": "https://www.bcn.cl/leychile/navega?idNorma=6654", "fuente": "LeyChile/BCN"},
    {"id": "04-01-002", "categoria": "04_Patrimonio_Arqueologia_y_Hallazgos", "subcategoria": "", "tipo": "Decreto_Supremo", "numero": "484", "anio": "1990", "organismo": "MinEducacion", "titulo": "Reglamento de la Ley de Monumentos Nacionales", "nombre_corto": "Reglamento_Monumentos_Nacionales", "url": "https://www.bcn.cl/leychile/navega?idNorma=29524", "fuente": "LeyChile/BCN"},

    # 5) Procedimiento administrativo, transparencia y defensa jurídica
    {"id": "05-01-001", "categoria": "05_Procedimiento_Administrativo_Transparencia_y_Defensa_Juridica", "subcategoria": "", "tipo": "Ley", "numero": "19880", "anio": "2003", "organismo": "BCN", "titulo": "Ley de Bases de los Procedimientos Administrativos que rigen los órganos de la Administración del Estado", "nombre_corto": "Bases_Procedimientos_Administrativos", "url": "https://www.bcn.cl/leychile/navega?idNorma=22165", "fuente": "LeyChile/BCN"},
    {"id": "05-01-002", "categoria": "05_Procedimiento_Administrativo_Transparencia_y_Defensa_Juridica", "subcategoria": "", "tipo": "Ley", "numero": "20285", "anio": "2008", "organismo": "BCN", "titulo": "Ley de Transparencia de la Función Pública y de Acceso a la Información de la Administración del Estado", "nombre_corto": "Ley_Transparencia", "url": "https://www.bcn.cl/leychile/navega?idNorma=27748", "fuente": "LeyChile/BCN"},

    # 6) Bienes del Estado, propiedad y regularización
    {"id": "06-01-001", "categoria": "06_Bienes_del_Estado_Propiedad_y_Regularizacion", "subcategoria": "", "tipo": "Decreto_Ley", "numero": "1939", "anio": "1977", "organismo": "BCN", "titulo": "Normas sobre administración y disposición de bienes del Estado", "nombre_corto": "Bienes_del_Estado", "url": "https://www.bcn.cl/leychile/navega?idNorma=6580", "fuente": "LeyChile/BCN"},
    {"id": "06-01-002", "categoria": "06_Bienes_del_Estado_Propiedad_y_Regularizacion", "subcategoria": "", "tipo": "Decreto_Ley", "numero": "2695", "anio": "1979", "organismo": "BCN", "titulo": "Regularización de la pequeña propiedad y construcción", "nombre_corto": "Regularizacion_Pequena_Propiedad", "url": "https://www.bcn.cl/leychile/navega?idNorma=6647", "fuente": "LeyChile/BCN"},
    {"id": "06-01-003", "categoria": "06_Bienes_del_Estado_Propiedad_y_Regularizacion", "subcategoria": "", "tipo": "Ley", "numero": "21442", "anio": "2022", "organismo": "BCN", "titulo": "Moderniza y simplifica la normativa de regularización de propiedades", "nombre_corto": "Regularizacion_Propiedades", "url": "https://www.bcn.cl/leychile/navega?idNorma=117814", "fuente": "LeyChile/BCN"},

    # 7) Pueblos indígenas, consulta y territorio
    {"id": "07-01-001", "categoria": "07_Pueblos_Indigenas_Consulta_y_Territorio", "subcategoria": "", "tipo": "Ley", "numero": "19253", "anio": "1993", "organismo": "BCN", "titulo": "Ley Indígena", "nombre_corto": "Ley_Indigena", "url": "https://www.bcn.cl/leychile/navega?idNorma=30312", "fuente": "LeyChile/BCN"},
    {"id": "07-01-002", "categoria": "07_Pueblos_Indigenas_Consulta_y_Territorio", "subcategoria": "", "tipo": "Decreto_Supremo", "numero": "66", "anio": "2013", "organismo": "MinDesarrolloSocial", "titulo": "Reglamento del Sistema de Consulta Indígena", "nombre_corto": "Consulta_Indigena", "url": "https://www.bcn.cl/leychile/navega?idNorma=105244", "fuente": "LeyChile/BCN"},
    {"id": "07-01-003", "categoria": "07_Pueblos_Indigenas_Consulta_y_Territorio", "subcategoria": "", "tipo": "Decreto_Supremo", "numero": "236", "anio": "2008", "organismo": "MinRelacionesExteriores", "titulo": "Aprueba Convenio 169 de la OIT sobre pueblos indígenas y tribales", "nombre_corto": "Convenio_169_OIT", "url": "https://www.bcn.cl/leychile/navega?idNorma=28332", "fuente": "LeyChile/BCN"},

    # 8) Forestal y bosque nativo
    # 8.1 Bosque nativo
    {"id": "08-01-001", "categoria": "08_Forestal_y_Bosque_Nativo", "subcategoria": "08_01_Bosque_Nativo", "tipo": "Ley", "numero": "20283", "anio": "2008", "organismo": "BCN", "titulo": "Ley sobre recuperación del bosque nativo y fomento forestal", "nombre_corto": "Bosque_Nativo", "url": "https://www.bcn.cl/leychile/navega?idNorma=27218", "fuente": "LeyChile/BCN"},
    {"id": "08-01-002", "categoria": "08_Forestal_y_Bosque_Nativo", "subcategoria": "08_01_Bosque_Nativo", "tipo": "Decreto_Supremo", "numero": "93", "anio": "2008", "organismo": "Minagri", "titulo": "Reglamento de la Ley de Bosque Nativo", "nombre_corto": "Reglamento_Bosque_Nativo", "url": "https://www.minagri.gob.cl/", "fuente": "Minagri"},

    # 8.2 Régimen DL 701
    {"id": "08-02-001", "categoria": "08_Forestal_y_Bosque_Nativo", "subcategoria": "08_02_Regimen_DL_701", "tipo": "Decreto_Ley", "numero": "701", "anio": "1974", "organismo": "BCN", "titulo": "Decreto Ley de Fomento Forestal", "nombre_corto": "DL_701_Fomento_Forestal", "url": "https://www.bcn.cl/leychile/navega?idNorma=6578", "fuente": "LeyChile/BCN"},
    {"id": "08-02-002", "categoria": "08_Forestal_y_Bosque_Nativo", "subcategoria": "08_02_Regimen_DL_701", "tipo": "Decreto_Supremo", "numero": "193", "anio": "1998", "organismo": "Minagri", "titulo": "Reglamento del DL 701", "nombre_corto": "Reglamento_DL_701", "url": "https://www.minagri.gob.cl/", "fuente": "Minagri"},
    {"id": "08-02-003", "categoria": "08_Forestal_y_Bosque_Nativo", "subcategoria": "08_02_Regimen_DL_701", "tipo": "Decreto_Supremo", "numero": "259", "anio": "1980", "organismo": "Minagri", "titulo": "Reglamento de reforestación de suelos de aptitud forestal", "nombre_corto": "Reforestacion_Suelos_Forestales", "url": "https://www.minagri.gob.cl/", "fuente": "Minagri"},
    {"id": "08-02-004", "categoria": "08_Forestal_y_Bosque_Nativo", "subcategoria": "08_02_Regimen_DL_701", "tipo": "Ley", "numero": "19561", "anio": "1998", "organismo": "BCN", "titulo": "Prorroga vigencia del DL 701", "nombre_corto": "Prorroga_DL_701", "url": "https://www.bcn.cl/leychile/navega?idNorma=60674", "fuente": "LeyChile/BCN"},

    # 9) Borde costero y concesiones marítimas
    {"id": "09-01-001", "categoria": "09_Borde_Costero_y_Concesiones_Maritimas", "subcategoria": "", "tipo": "DFL", "numero": "340", "anio": "1960", "organismo": "Mindefensa", "titulo": "Ley de Concesiones Marítimas", "nombre_corto": "Concesiones_Maritimas", "url": "https://www.bcn.cl/leychile/navega?idNorma=6631", "fuente": "LeyChile/BCN"},
    {"id": "09-01-002", "categoria": "09_Borde_Costero_y_Concesiones_Maritimas", "subcategoria": "", "tipo": "Decreto_Supremo", "numero": "660", "anio": "1988", "organismo": "Mindefensa", "titulo": "Reglamento de la Ley de Concesiones Marítimas", "nombre_corto": "Reglamento_Concesiones_Maritimas", "url": "https://www.bcn.cl/leychile/navega?idNorma=29524", "fuente": "LeyChile/BCN"},

    # 10) Vialidad, caminos y tránsito
    {"id": "10-01-001", "categoria": "10_Vialidad_Caminos_y_Transito", "subcategoria": "", "tipo": "DFL", "numero": "850", "anio": "1997", "organismo": "MOP", "titulo": "Ley de Caminos", "nombre_corto": "Ley_Caminos", "url": "https://www.bcn.cl/leychile/navega?idNorma=6631", "fuente": "LeyChile/BCN"},
    {"id": "10-01-002", "categoria": "10_Vialidad_Caminos_y_Transito", "subcategoria": "", "tipo": "Resolucion_Exenta", "numero": "4677", "anio": "1999", "organismo": "Vialidad", "titulo": "Instrucciones para la aplicación de la Ley de Caminos", "nombre_corto": "Instrucciones_Ley_Caminos", "url": "https://www.mop.cl/", "fuente": "MOP"},
    {"id": "10-01-003", "categoria": "10_Vialidad_Caminos_y_Transito", "subcategoria": "", "tipo": "Ley", "numero": "18290", "anio": "1984", "organismo": "BCN", "titulo": "Ley de Tránsito", "nombre_corto": "Ley_Transito", "url": "https://www.bcn.cl/leychile/navega?idNorma=6631", "fuente": "LeyChile/BCN"},

    # 11) Energía y servidumbres eléctricas
    {"id": "11-01-001", "categoria": "11_Energia_y_Servidumbres_Electricas", "subcategoria": "", "tipo": "DFL", "numero": "4", "anio": "2007", "organismo": "MINECON", "titulo": "Ley General de Servicios Eléctricos", "nombre_corto": "Ley_Gral_Servicios_Electricos", "url": "https://www.bcn.cl/leychile/navega?idNorma=27748", "fuente": "LeyChile/BCN"},

    # 12) Técnica estructural y normas oficializadas
    {"id": "12-01-001", "categoria": "12_Tecnica_Estructural_y_Normas_Oficializadas", "subcategoria": "", "tipo": "Decreto_Supremo", "numero": "60", "anio": "2011", "organismo": "MINVU", "titulo": "Ordenanza General de Urbanismo y Construcciones - Capítulo 1", "nombre_corto": "OGUC_Cap1", "url": "https://www.minvu.gob.cl/", "fuente": "MINVU"},
    {"id": "12-01-002", "categoria": "12_Tecnica_Estructural_y_Normas_Oficializadas", "subcategoria": "", "tipo": "Decreto_Supremo", "numero": "61", "anio": "2011", "organismo": "MINVU", "titulo": "Ordenanza General de Urbanismo y Construcciones - Capítulo 2", "nombre_corto": "OGUC_Cap2", "url": "https://www.minvu.gob.cl/", "fuente": "MINVU"},
]

def crear_estructura_norma(norma):
    """Crea la estructura de carpetas para una norma"""
    tipo_abrev = {
        "Ley": "Ley", "Decreto_Supremo": "DS", "DFL": "DFL",
        "Decreto_Ley": "DL", "Decreto": "D", "Resolucion_Exenta": "RES"
    }.get(norma["tipo"], norma["tipo"])

    nombre_carpeta = f"{tipo_abrev}_{norma['numero']}_{norma['anio']}_{norma['organismo']}_{norma['nombre_corto']}"

    ruta_base = os.path.join(BASE_PATH, norma["categoria"], norma["subcategoria"], nombre_carpeta)

    subcarpetas = ["01_fuente_oficial", "02_texto_extraido", "03_metadatos", "04_referencias"]

    for sub in subcarpetas:
        os.makedirs(os.path.join(ruta_base, sub), exist_ok=True)

    return ruta_base, nombre_carpeta

def crear_fuente_txt(ruta, norma):
    """Crea archivo fuente.txt"""
    contenido = f"""FUENTE OFICIAL - {norma['tipo']} {norma['numero']}
{'=' * 50}

Título: {norma['titulo']}
Número: {norma['numero']}
Año: {norma['anio']}
Organismo: {norma['organismo']}
Estado: Vigente

URL Oficial:
{norma['url']}

OBSERVACIONES:
- El sitio requiere interacción manual para descargar el PDF.
- La descarga automatizada está bloqueada.
- Se recomienda descargar manualmente desde el navegador.
- Fecha de consulta: 2026-04-24
"""
    with open(os.path.join(ruta, "01_fuente_oficial", "fuente.txt"), "w", encoding="utf-8") as f:
        f.write(contenido)

def crear_metadata_json(ruta, norma):
    """Crea archivo metadata.json"""
    tipo_abrev = {
        "Ley": "Ley", "Decreto_Supremo": "Decreto Supremo", "DFL": "DFL",
        "Decreto_Ley": "Decreto Ley", "Decreto": "Decreto", "Resolucion_Exenta": "Resolución Exenta"
    }.get(norma["tipo"], norma["tipo"])

    metadata = {
        "titulo_oficial": norma["titulo"],
        "nombre_corto": norma["nombre_corto"],
        "tipo_norma": tipo_abrev,
        "numero": norma["numero"],
        "anio": norma["anio"],
        "organismo": norma["organismo"],
        "tema_principal": norma["categoria"].replace("_", " "),
        "subtema": norma.get("subcategoria", "").replace("_", " ") if norma.get("subcategoria") else "",
        "estado_descarga": "pendiente_revision_manual",
        "fuente_principal": norma["fuente"],
        "fuentes_secundarias": [],
        "url": norma["url"],
        "fecha_consulta": "2026-04-24",
        "formato_descargado": "html_pendiente_pdf",
        "vigente_o_historica": "vigente",
        "observaciones": "PDF requiere descarga manual. Sitio oficial bloquea descargas automatizadas."
    }

    with open(os.path.join(ruta, "03_metadatos", "metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

def crear_notas_md(ruta, norma):
    """Crea archivo notas.md"""
    contenido = f"""# Notas - {norma['tipo']} {norma['numero']}

## Estado de Descarga
- **Fecha de consulta:** 2026-04-24
- **Estado:** Pendiente de descarga manual
- **Motivo:** El sitio oficial (LeyChile/BCN o ministerio correspondiente) bloquea descargas automatizadas.

## Acciones Requeridas
1. Visitar la URL oficial indicada en fuente.txt
2. Descargar el PDF usando la opción de exportación
3. Guardar en carpeta 01_fuente_oficial/
4. Extraer texto a 02_texto_extraido/version.txt

## URL de Descarga
{norma['url']}

## Verificación
- [ ] PDF descargado correctamente
- [ ] Archivo no está vacío
- [ ] Texto extraído
- [ ] Metadatos verificados
"""
    with open(os.path.join(ruta, "03_metadatos", "notas.md"), "w", encoding="utf-8") as f:
        f.write(contenido)

def procesar_todas_las_normas():
    """Procesa todas las normas del listado"""
    resultados = []

    for norma in NORMAS:
        try:
            ruta, carpeta = crear_estructura_norma(norma)
            crear_fuente_txt(ruta, norma)
            crear_metadata_json(ruta, norma)
            crear_notas_md(ruta, norma)
            resultados.append({"id": norma["id"], "estado": "estructura_creada", "carpeta": carpeta})
            print(f"[OK] {norma['id']}: {carpeta}")
        except Exception as e:
            resultados.append({"id": norma["id"], "estado": "error", "error": str(e)})
            print(f"[ERR] {norma['id']}: {e}")

    return resultados

if __name__ == "__main__":
    print("Procesando normativa chilena...\n")
    resultados = procesar_todas_las_normas()
    print(f"\nTotal procesadas: {len(resultados)}")
    exitosas = sum(1 for r in resultados if r["estado"] == "estructura_creada")
    print(f"Exitosas: {exitosas}")
    print(f"Errores: {len(resultados) - exitosas}")
