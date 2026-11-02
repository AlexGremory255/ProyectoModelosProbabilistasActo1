import { combinaciones, claveCpt } from './red.js';

export const minimoNodos = 3;
export const maximoNodos = 10;
export const minimoEstados = 2;
export const toleranciaSuma = 1e-6;

const esTextoValido = valor => typeof valor === 'string' && valor.trim().length > 0;

export function validarRed(red) {
  if (!red || typeof red !== 'object' || !Array.isArray(red.nodos)) {
    return { esValida: false, errores: ['La red no es válida: falta la lista "nodos".'] };}

  const errores = [];
  const listaNodos = red.nodos;
  const agregarError = mensaje => errores.push(mensaje);

  if (listaNodos.length < minimoNodos) agregarError(`La red tiene ${listaNodos.length} nodos; el mínimo es ${minimoNodos}.`);
  if (listaNodos.length > maximoNodos) agregarError(`La red tiene ${listaNodos.length} nodos; el máximo es ${maximoNodos}.`);

  const identificadoresVistos = new Set();
  const estadosPorNodo = new Map();

  for (const nodo of listaNodos) {
    const identificador = nodo?.id;

    if (!esTextoValido(identificador)) {
      agregarError('Hay un nodo sin nombre válido.');
      continue;}

    if (identificadoresVistos.has(identificador)) agregarError(`El nombre de nodo "${identificador}" está repetido.`);
    identificadoresVistos.add(identificador);

    const estadosNodo = nodo.estados;

    if (!Array.isArray(estadosNodo) || estadosNodo.length < minimoEstados) {
      agregarError(`El nodo "${identificador}" necesita al menos ${minimoEstados} estados.`);
      continue;}

    const tieneEstadoInvalido = estadosNodo.some(
      (estadoActual, posicionEstado) =>
        !esTextoValido(estadoActual) ||
        estadoActual.includes(',') ||
        estadosNodo.indexOf(estadoActual) !== posicionEstado);

    if (tieneEstadoInvalido) {
      agregarError(`El nodo "${identificador}" tiene estados vacíos, repetidos o con comas.`);
      continue;}

    estadosPorNodo.set(identificador, estadosNodo);}

  const padresPorNodo = new Map();

  for (const nodo of listaNodos) {
    if (!esTextoValido(nodo?.id)) continue;

    const padresNodo = nodo.padres ?? [];

    if (!Array.isArray(padresNodo)) {
      agregarError(`Los padres del nodo "${nodo.id}" deben ser una lista.`);
      continue;}

    let padresValidos = true;

    padresNodo.forEach((nombrePadre, posicionPadre) => {
      if (nombrePadre === nodo.id) {
        agregarError(`El nodo "${nodo.id}" no puede ser padre de sí mismo.`);
      } else if (!identificadoresVistos.has(nombrePadre)) {
        agregarError(`El nodo "${nodo.id}" tiene un padre inexistente: "${nombrePadre}".`);
      } else if (padresNodo.indexOf(nombrePadre) !== posicionPadre) {
        agregarError(`El nodo "${nodo.id}" tiene al padre "${nombrePadre}" repetido.`);
      } else {
        return;}
      padresValidos = false;});

    if (padresValidos) padresPorNodo.set(nodo.id, padresNodo);}

  const nodosPendientes = new Map(padresPorNodo);
  let huboCambios = true;

  while (huboCambios) {
    huboCambios = false;
    for (const [identificador, padresNodo] of nodosPendientes) {
      if (padresNodo.every(nombrePadre => !nodosPendientes.has(nombrePadre))) {
        nodosPendientes.delete(identificador);
        huboCambios = true;}}}

  if (nodosPendientes.size > 0) {
    agregarError(`La red contiene un ciclo (no es un grafo dirigido acíclico). Nodos involucrados: ${[...nodosPendientes.keys()].join(', ')}.`);}

  for (const nodo of listaNodos) {
    const identificador = nodo?.id;
    const estadosNodo = estadosPorNodo.get(identificador);
    const padresNodo = padresPorNodo.get(identificador);

    if (!estadosNodo || !padresNodo || !padresNodo.every(nombrePadre => estadosPorNodo.has(nombrePadre))) continue;

    if (!nodo.cpt || typeof nodo.cpt !== 'object' || Array.isArray(nodo.cpt)) {
      agregarError(`El nodo "${identificador}" no tiene tabla de probabilidad (cpt).`);
      continue;}

    const clavesEsperadas = combinaciones(padresNodo.map(nombrePadre => estadosPorNodo.get(nombrePadre))).map(claveCpt);

    for (const claveActual of clavesEsperadas) {
      const etiquetaFila = claveActual === '' ? '(sin padres)' : `[${claveActual}]`;
      const filaProbabilidades = nodo.cpt[claveActual];

      if (filaProbabilidades === undefined) {
        agregarError(`La CPT del nodo "${identificador}" no tiene la fila ${etiquetaFila}.`);
        continue;}

      if (!Array.isArray(filaProbabilidades) || filaProbabilidades.length !== estadosNodo.length) {
        agregarError(`La fila ${etiquetaFila} de la CPT de "${identificador}" debe tener ${estadosNodo.length} probabilidades.`);
        continue;}

      if (!filaProbabilidades.every(probabilidad => typeof probabilidad === 'number' && probabilidad >= 0 && probabilidad <= 1)) {
        agregarError(`La fila ${etiquetaFila} de la CPT de "${identificador}" tiene valores que no son probabilidades (entre 0 y 1).`);
        continue;}

      const sumaFila = filaProbabilidades.reduce((acumulado, probabilidad) => acumulado + probabilidad, 0);
      if (Math.abs(sumaFila - 1) > toleranciaSuma) {
        agregarError(`La fila ${etiquetaFila} de la CPT de "${identificador}" suma ${sumaFila}, y debe sumar 1.`);}}

    for (const claveExistente of Object.keys(nodo.cpt)) {
      if (!clavesEsperadas.includes(claveExistente)) {
        agregarError(`La CPT del nodo "${identificador}" tiene una fila que no corresponde a sus padres: "${claveExistente}".`);}}}

  return { esValida: errores.length === 0, errores };}
