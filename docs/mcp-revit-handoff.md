# Guía de Handoff: Conectar Otras IAs al MCP de Revit

Cualquier otra IA (o cliente compatible con Model Context Protocol como Claude Desktop,
Cursor, Windsurf, Claude Code, Cline, etc.) puede conectarse al servidor MCP de Revit
siguiendo esta especificación.

---

## 1. Arquitectura y funcionamiento

```
[Cliente IA / LLM] ──(MCP stdio/HTTP)──> [FastMCP Server (Python 3.11+)] ──(HTTP :48884)──> [pyRevit Routes] ──> [Autodesk Revit API]
```

- **Ruta local del servidor MCP:** `C:\revit-mcp-server`
- **Python runtime:** administrado con `uv`
- **Revit Routes API:** activo en `http://localhost:48884/revit_mcp/`
- **Unidades del MCP:** todas las dimensiones y coordenadas se especifican en milímetros
  (mm); el servidor las convierte internamente a pies de Revit.

---

## 2. Configuraciones de conexión según el cliente de IA

### A. Clientes stdio (Antigravity IDE, Claude Desktop, Claude Code)

Agregar en el archivo de configuración (`mcp_config.json` o `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "revit": {
      "command": "uv",
      "args": [
        "--directory",
        "C:\\revit-mcp-server",
        "run",
        "main.py"
      ]
    }
  }
}
```

### B. Clientes HTTP / Streamable (Cursor, Windsurf, LibreChat)

1. Iniciar el servidor en modo HTTP:

   ```bash
   cd C:\revit-mcp-server
   uv run main.py --streamable-http
   ```

2. Conectar el cliente al endpoint: `http://localhost:8000/mcp`

---

## 3. Resumen de herramientas MCP disponibles (48 herramientas)

- **Creación:** `create_line_based_element` (muros/vigas), `create_surface_based_element`
  (pisos/techos), `place_family` (puertas/ventanas/muebles), `create_level`, `create_grid`,
  `create_room`, `create_duct`, `create_pipe`, `create_view`, `create_sheet`.
- **Consulta:** `get_revit_status`, `get_revit_model_info`, `list_levels`, `list_families`,
  `list_family_categories`, `list_revit_views`, `get_current_view_info`,
  `get_selected_elements`, `get_element_properties`.
- **Modificación:** `modify_element`, `delete_elements`, `transform_elements`
  (mover/rotar/copiar), `set_parameter`, `set_active_view`, `color_splash`, `clear_colors`.
- **Análisis y documentación:** `check_clashes` (interferencias estructura vs MEP),
  `export_room_data`, `get_material_quantities`, `create_dimensions`, `tag_walls`,
  `export_ifc`, `load_family`, `save_document`, `execute_revit_code`.
