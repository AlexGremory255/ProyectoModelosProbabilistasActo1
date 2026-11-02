import { validarRed, maximoNodos } from './logica/validacion.js';
import { combinaciones, claveCpt } from './logica/red.js';

const estado = {
  red: { nombre: 'Red nueva', nodos: [], posiciones: {} },
  seleccionado: null,
  consulta: [],
  evidencia: {},
  resultado: null,
  errores: []};

const suscriptores = [];

export const escapar = texto =>
  String(texto).replace(/[&<>"']/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'}[caracter]));

const redondear = valor => Math.round(valor * 1e6) / 1e6;

export function obtener() {
  return estado;}

export function suscribir(funcion) {
  suscriptores.push(funcion);}

export function actualizar(cambio = {}, origen = null) {
  Object.assign(estado, cambio);
  estado.errores = validarRed(estado.red).errores;
  suscriptores.forEach(funcion => funcion(origen));}

export function buscarNodo(identificador) {
  return estado.red.nodos.find(nodo => nodo.id === identificador);}

function filaUniforme(cantidadEstados) {
  const valorBase = redondear(1 / cantidadEstados);
  const fila = new Array(cantidadEstados).fill(valorBase);
  fila[cantidadEstados - 1] = redondear(1 - valorBase * (cantidadEstados - 1));
  return fila;}

function regenerarCpt(nodo) {
  const tablaNueva = {};
  const estadosDePadres = nodo.padres.map(nombrePadre => buscarNodo(nombrePadre).estados);
  for (const combinacion of combinaciones(estadosDePadres)) {
    const clave = claveCpt(combinacion);
    const filaAnterior = nodo.cpt[clave];
    tablaNueva[clave] =
      filaAnterior && filaAnterior.length === nodo.estados.length
        ? filaAnterior
        : filaUniforme(nodo.estados.length);}
  nodo.cpt = tablaNueva;}

function depurarSeleccion() {
  const identificadoresActivos = new Set(estado.red.nodos.map(nodo => nodo.id));
  estado.consulta = estado.consulta.filter(identificador => identificadoresActivos.has(identificador));
  for (const identificador of Object.keys(estado.evidencia)) {
    const nodo = buscarNodo(identificador);
    if (!nodo || !nodo.estados.includes(estado.evidencia[identificador])) {
      delete estado.evidencia[identificador];}}}

export function nuevaRed(nombre) {
  actualizar({
    red: { nombre: nombre || 'Red nueva', nodos: [], posiciones: {} },
    seleccionado: null,
    consulta: [],
    evidencia: {},
    resultado: null});}

export function renombrarRed(nombre) {
  estado.red.nombre = nombre || 'Red sin nombre';
  actualizar({}, 'nombre');}

export function agregarNodo(identificador, estados) {
  if (estado.red.nodos.length >= maximoNodos) return false;
  const posicion = estado.red.nodos.length;
  const nodo = { id: identificador, estados, padres: [], cpt: {} };
  estado.red.nodos.push(nodo);
  estado.red.posiciones[identificador] = [130 + (posicion % 4) * 180, 80 + Math.floor(posicion / 4) * 120];
  regenerarCpt(nodo);
  actualizar({ seleccionado: identificador, resultado: null });
  return true;}

export function eliminarNodo(identificador) {
  estado.red.nodos = estado.red.nodos.filter(nodo => nodo.id !== identificador);
  delete estado.red.posiciones[identificador];
  estado.red.nodos.forEach(nodo => {
    if (nodo.padres.includes(identificador)) {
      nodo.padres = nodo.padres.filter(nombrePadre => nombrePadre !== identificador);
      regenerarCpt(nodo);}});
  depurarSeleccion();
  actualizar({ seleccionado: estado.red.nodos[0]?.id ?? null, resultado: null });}

export function renombrarNodo(identificadorViejo, identificadorNuevo) {
  if (!identificadorNuevo || identificadorNuevo === identificadorViejo || buscarNodo(identificadorNuevo)) return false;
  const nodo = buscarNodo(identificadorViejo);
  if (!nodo) return false;

  nodo.id = identificadorNuevo;
  if (estado.red.posiciones[identificadorViejo]) {
    estado.red.posiciones[identificadorNuevo] = estado.red.posiciones[identificadorViejo];
    delete estado.red.posiciones[identificadorViejo];}

  estado.red.nodos.forEach(otroNodo => {
    otroNodo.padres = otroNodo.padres.map(nombrePadre =>
      nombrePadre === identificadorViejo ? identificadorNuevo : nombrePadre);});

  estado.consulta = estado.consulta.map(identificador =>
    identificador === identificadorViejo ? identificadorNuevo : identificador);

  if (identificadorViejo in estado.evidencia) {
    estado.evidencia[identificadorNuevo] = estado.evidencia[identificadorViejo];
    delete estado.evidencia[identificadorViejo];}

  if (estado.seleccionado === identificadorViejo) estado.seleccionado = identificadorNuevo;
  actualizar({ resultado: null });
  return true;}

export function cambiarEstados(identificador, estados) {
  const nodo = buscarNodo(identificador);
  if (!nodo) return;
  nodo.estados = estados;
  regenerarCpt(nodo);
  estado.red.nodos.filter(nodoHijo => nodoHijo.padres.includes(identificador)).forEach(regenerarCpt);
  depurarSeleccion();
  actualizar({ resultado: null });}

export function cambiarPadres(identificador, padres) {
  const nodo = buscarNodo(identificador);
  if (!nodo) return;
  nodo.padres = padres;
  regenerarCpt(nodo);
  actualizar({ resultado: null });}

export function ponerProbabilidad(identificador, clave, posicionEstado, valor) {
  const nodo = buscarNodo(identificador);
  if (!nodo || !nodo.cpt[clave]) return null;
  const fila = nodo.cpt[clave];
  const cantidadEstados = fila.length;
  fila[posicionEstado] = redondear(Math.max(0, Math.min(1, Number(valor) || 0)));

  if (cantidadEstados === 2) {
    fila[1 - posicionEstado] = redondear(1 - fila[posicionEstado]);
  } else if (posicionEstado !== cantidadEstados - 1) {
    const sumaRestante = fila
      .slice(0, cantidadEstados - 1)
      .reduce((acumulado, probabilidad) => acumulado + probabilidad, 0);
    fila[cantidadEstados - 1] = redondear(Math.max(0, 1 - sumaRestante));}

  actualizar({ resultado: null }, 'cpt');
  return fila;}

export function normalizarFilaCpt(identificador, clave) {
  const nodo = buscarNodo(identificador);
  if (!nodo || !nodo.cpt[clave]) return;
  const fila = nodo.cpt[clave];
  const sumaTotal = fila.reduce((acumulado, probabilidad) => acumulado + (Number(probabilidad) || 0), 0);
  if (sumaTotal > 0) {
    for (let posicionEstado = 0; posicionEstado < fila.length; posicionEstado++) {
      fila[posicionEstado] = redondear(fila[posicionEstado] / sumaTotal);}
    const sumaParcial = fila.slice(0, -1).reduce((acumulado, probabilidad) => acumulado + probabilidad, 0);
    fila[fila.length - 1] = redondear(1 - sumaParcial);
  } else {
    nodo.cpt[clave] = filaUniforme(fila.length);}
  actualizar({ resultado: null });}

export function distribuirUniformeTodoNodo(identificador) {
  const nodo = buscarNodo(identificador);
  if (!nodo) return;
  for (const clave of Object.keys(nodo.cpt)) nodo.cpt[clave] = filaUniforme(nodo.estados.length);
  actualizar({ resultado: null });}

export function asignarPapel(identificador, papel) {
  estado.consulta = estado.consulta.filter(otroIdentificador => otroIdentificador !== identificador);
  delete estado.evidencia[identificador];
  if (papel === 'consulta') estado.consulta.push(identificador);
  else if (papel && papel !== 'oculta') estado.evidencia[identificador] = papel;
  actualizar({ resultado: null });}

export function limpiarConsulta() {
  actualizar({ consulta: [], evidencia: {}, resultado: null });}

export function autoOrganizarNodos(notificar = true) {
  const { red } = estado;
  if (!red.nodos.length) return;

  const nivelPorNodo = new Map(red.nodos.map(nodo => [nodo.id, 0]));
  for (let iteracion = 0; iteracion < red.nodos.length; iteracion++) {
    let huboCambio = false;
    for (const nodo of red.nodos) {
      if (!nodo.padres.length) continue;
      const nivelCalculado = Math.max(...nodo.padres.map(nombrePadre => nivelPorNodo.get(nombrePadre) ?? 0)) + 1;
      if (nivelCalculado > nivelPorNodo.get(nodo.id)) {
        nivelPorNodo.set(nodo.id, nivelCalculado);
        huboCambio = true;}}
    if (!huboCambio) break;}

  const capasPorNivel = [];
  nivelPorNodo.forEach((nivel, identificador) => (capasPorNivel[nivel] ||= []).push(identificador));
  const capasCompactas = capasPorNivel.filter(Boolean);

  const anchoLienzo = 800;
  const altoLienzo = 480;
  const separacionVertical = Math.min(130, (altoLienzo - 120) / Math.max(1, capasCompactas.length - 1));
  const inicioVertical = (altoLienzo - separacionVertical * (capasCompactas.length - 1)) / 2;

  capasCompactas.forEach((grupoNodos, nivelActual) => {
    grupoNodos.sort((primerIdentificador, segundoIdentificador) => {
      const promedioHorizontalPadres = identificador => {
        const padresNodo = buscarNodo(identificador)?.padres || [];
        if (!padresNodo.length) return 0;
        const sumaHorizontal = padresNodo.reduce(
          (acumulado, nombrePadre) => acumulado + (red.posiciones[nombrePadre]?.[0] ?? 400),
          0);
        return sumaHorizontal / padresNodo.length;};
      return promedioHorizontalPadres(primerIdentificador) - promedioHorizontalPadres(segundoIdentificador);});

    const separacionHorizontal = Math.min(190, anchoLienzo / (grupoNodos.length + 1));
    const inicioHorizontal = (anchoLienzo - separacionHorizontal * (grupoNodos.length - 1)) / 2;
    grupoNodos.forEach((identificador, posicionEnCapa) => {
      red.posiciones[identificador] = [
        Math.round(inicioHorizontal + posicionEnCapa * separacionHorizontal),
        Math.round(inicioVertical + nivelActual * separacionVertical)];});});

  if (notificar) actualizar();}
