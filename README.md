[readme.MD](https://github.com/user-attachments/files/34298041/readme.MD)
# Redes bayesianas

Aplicación web para construir, visualizar y consultar redes bayesianas. El proyecto permite definir nodos, estados y tablas de probabilidad condicional, así como realizar consultas mediante eliminación de variables.

## Aplicación

La aplicación está disponible en GitHub Pages:

[Abrir Redes bayesianas](https://alexgremory255.github.io/ProyectoModelosProbabilistasActo1/)

## Contenido del repositorio

- `src/`: código fuente de la aplicación.
- `src/logica/`: validación de redes, operaciones con factores, enumeración y eliminación de variables.
- `src/ui/`: editor, grafo, consultas, diálogos e impresión de reportes.
- `ejemplos/`: redes bayesianas en formato JSON listas para cargar.
- `index.html`: punto de entrada de la aplicación.
- `css/estilos.css`: estilos de la interfaz.
- `package.json`: metadatos.

## Requisitos para correr en local

- Un navegador moderno con soporte para JavaScript.
- Un servidor HTTP local para cargar la aplicación. 
NOTA: No se recomienda abrir `index.html` directamente con `file://`, porque los navegadores pueden bloquear la carga de los ejemplos y de los módulos.

## Instalación y ejecución

La aplicación no requiere dependencias externas para ejecutarse a nivel web. Para ejecución local, iniciar un servidor local con Python:

```bash
cd ProyectoModelosProbabilistasActo1
python3 -m http.server 8000
```

Después, abre `http://localhost:8000` en el navegador.

## Uso de la aplicación

1. Crea una red nueva o carga uno de los ejemplos disponibles.
2. Agrega nodos, define sus estados y establece sus relaciones de dependencia.
3. Introduce las probabilidades de cada tabla de probabilidad condicional.
4. Selecciona las variables de consulta y, si es necesario, añade evidencia.
5. Ejecuta la consulta para obtener la distribución de probabilidad.
6. Guarda la red como un archivo JSON o imprime un reporte.

La aplicación valida la red antes de cargarla. Actualmente acepta redes de 3 a 10 nodos y cada nodo debe tener al menos 2 estados.

## Formato de los archivos JSON

Una red se representa como un objeto con un nombre opcional, una lista de nodos y posiciones opcionales para la visualización:

```json
{
  "nombre": "Cadena de 3 nodos",
  "nodos": [
    {
      "id": "A",
      "estados": ["si", "no"],
      "padres": [],
      "cpt": {
        "": [0.3, 0.7]
      }
    },
    {
      "id": "B",
      "estados": ["si", "no"],
      "padres": ["A"],
      "cpt": {
        "si": [0.9, 0.1],
        "no": [0.2, 0.8]
      }
    }
  ],
  "posiciones": {
    "A": [120, 80],
    "B": [120, 200]
  }
}
```

Cada nodo contiene:

- `id`: identificador único del nodo.
- `estados`: estados posibles del nodo. Debe haber al menos dos y no pueden repetirse ni contener comas.
- `padres`: identificadores de los nodos padres. Deben formar un grafo dirigido acíclico.
- `cpt`: tabla de probabilidades condicionales. Cada fila debe tener una probabilidad por estado y sumar 1.

Las claves de `cpt` representan las combinaciones de estados de los padres. Para un nodo sin padres se utiliza la clave vacía `""`. Para un nodo con padres, las claves se forman con los estados correspondientes, separados por comas según el orden de `padres`.

Los archivos de ejemplo incluidos son:

- `ejemplos/cadena-3-nodos.json`
- `ejemplos/aspersor-4-nodos.json`
- `ejemplos/alarma-5-nodos.json`
- `ejemplos/diagnostico-6-nodos.json`
- `ejemplos/vehiculo-10-nodos.json`

## Evidencias de funcionamiento

Las capturas de uso y el procedimiento detallado, así como una comparación de soluciones usando una biblioteca de python realizadas en Google Colab se encuentran en el manual de usuario entregado junto con el proyecto, pero aquí se anexa una tabla con los resultados que se obtuvieron:

| Red de ejemplo | Consulta evaluada | Estado / Resultado | Nuestra web | PGMPY |
| :--- | :--- | :--- | :---: | :---: |
| **Cadena (3 nodos)** | `P(A \| C = si)` | `A = si`<br>`A = no`<br>`P(e)` | `0.5549`<br>`0.4451`<br>`0.346000` | `0.5549`<br>`0.4451`<br>`0.346000` |
| **Aspersor (4 nodos)** | `P(Lluvia \| PastoMojado = si)` | `Lluvia = si`<br>`Lluvia = no`<br>`P(e)` | `0.7079`<br>`0.2921`<br>`0.647100` | `0.7079`<br>`0.2921`<br>`0.647100` |
| **Alarma (5 nodos)** | `P(Robo \| JuanLlama = si, MariaLlama = si)` | `Robo = si`<br>`Robo = no`<br>`P(e)` | `0.2842`<br>`0.7158`<br>`0.002084` | `0.2842`<br>`0.7158`<br>`0.002084` |
| **Diagnóstico médico (6 nodos)** | `P(CancerPulmon \| Disnea = si, RayosX = positivo)` | `CancerPulmon = si`<br>`CancerPulmon = no`<br>`P(e)` | `0.1131`<br>`0.8869`<br>`0.069867` | `0.1131`<br>`0.8869`<br>`0.069867` |
| **Diagnóstico de vehículo (10 nodos)** | `P(Bateria, Alternador \| EncendidoMotor = falla, AlertaTablero = encendida)` | `ok, ok`<br>`falla, ok`<br>`ok, falla`<br>`falla, falla`<br>`P(e)` | `0.7177`<br>`0.2212`<br>`0.0480`<br>`0.0131`<br>`0.212841` | `0.7177`<br>`0.2212`<br>`0.0480`<br>`0.0131`<br>`0.212841` |

## Integrantes y contribuciones

### Integrantes

- Alexis Abraham Corona Meza — 1701450H
- Guillermo Fernández Gonzales — 2201153J

### Contribuciones

Las contribuciones se registran mediante los commits del repositorio y el trabajo documentado en el manual de usuario. La distribución del trabajo fue la siguiente:

- Alexis Abraham Corona Meza: desarrollo de la aplicación web, la interfaz, el editor de redes, la visualización del grafo, la carga y guardado de archivos, motor de inferencia por eliminación de variables y deploy en Github Pages.
- Guillermo Fernández Gonzales: desarrollo del proyecto, realización de commits y colaboración en la implementación, documentación y validación del funcionamiento.
