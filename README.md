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
- `tests/`: pruebas automatizadas de la lógica y la validación.
- `index.html`: punto de entrada de la aplicación.
- `css/estilos.css`: estilos de la interfaz.
- `package.json`: metadatos y comando de pruebas.

## Requisitos

- Node.js con soporte para `node:test` y módulos ES.
- Un navegador moderno con soporte para JavaScript, módulos ES, `FileReader`, `Blob` y `fetch`.
- Un servidor HTTP local para cargar la aplicación. No se recomienda abrir `index.html` directamente con `file://`, porque los navegadores pueden bloquear la carga de los ejemplos y de los módulos.

## Instalación y ejecución

La aplicación no requiere dependencias externas para ejecutarse. Para iniciar un servidor local con Python:

```bash
cd ProyectoModelosProbabilistasActo1
python3 -m http.server 8000
```

Después, abre `http://localhost:8000` en el navegador.

También se puede utilizar cualquier servidor HTTP estático equivalente.

## Pruebas

Para ejecutar las pruebas automatizadas:

```bash
npm test
```

Las pruebas comprueban, entre otros aspectos:

- Consultas con una o varias variables.
- Resultados de eliminación de variables frente a enumeración.
- Redes con y sin evidencia.
- Validación del número de nodos y estados.
- Detección de ciclos, padres inexistentes, identificadores repetidos y tablas inválidas.
- Casos aleatorios de redes de entre 3 y 10 nodos.

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

Las pruebas automatizadas se encuentran en `tests/logica.test.js` y se ejecutan con `npm test`. Además, la aplicación permite cargar los ejemplos, realizar consultas, visualizar la red y generar un reporte mediante la opción «Imprimir reporte».

El despliegue público se puede consultar en la sección [Aplicación](#aplicación). Las capturas de uso y el procedimiento detallado se encuentran en el manual de usuario entregado junto con el proyecto.

## Integrantes y contribuciones

### Integrantes

- Alexis Abraham Corona Meza — 1701450H
- Guillermo Fernández Gonzales — 2201153J

### Contribuciones

Las contribuciones se registran mediante los commits del repositorio y el trabajo documentado en el manual de usuario. La distribución del trabajo fue la siguiente:

- Alexis Abraham Corona Meza: desarrollo de la aplicación web, la interfaz, el editor de redes, la visualización del grafo, la carga y guardado de archivos, los ejemplos y las pruebas automatizadas.
- Guillermo Fernández Gonzales: desarrollo del proyecto, realización de commits y colaboración en la implementación, documentación y validación del funcionamiento.

## Licencia

No se ha definido una licencia para este proyecto.
