import { actualizar, autoOrganizarNodos } from './estado.js';
import { validarRed } from './logica/validacion.js';
import { avisar } from './ui/dialogos.js';

function cargarRed(red) {
  const resultadoValidacion = validarRed(red);
  if (!resultadoValidacion.esValida) {
    avisar('El archivo no contiene una red válida: ' + resultadoValidacion.errores[0], 'error');
    return;}

  red.nodos.forEach(nodo => {
    nodo.padres = nodo.padres || [];});
  red.posiciones = red.posiciones || {};

  const requiereAcomodo = red.nodos.some(
    nodo => !Array.isArray(red.posiciones[nodo.id]) || red.posiciones[nodo.id].length < 2);

  if (!requiereAcomodo && red.nodos.length > 0) {
    const coordenadasX = red.nodos.map(nodo => red.posiciones[nodo.id][0]);
    const coordenadasY = red.nodos.map(nodo => red.posiciones[nodo.id][1]);
    const desplazamientoX = Math.round(400 - (Math.min(...coordenadasX) + Math.max(...coordenadasX)) / 2);
    const desplazamientoY = Math.round(240 - (Math.min(...coordenadasY) + Math.max(...coordenadasY)) / 2);
    red.nodos.forEach(nodo => {
      red.posiciones[nodo.id] = [
        red.posiciones[nodo.id][0] + desplazamientoX,
        red.posiciones[nodo.id][1] + desplazamientoY];});}

  actualizar({
    red,
    seleccionado: red.nodos[0]?.id || null,
    consulta: [],
    evidencia: {},
    resultado: null});

  if (requiereAcomodo) autoOrganizarNodos();
  avisar(`Red «${red.nombre || 'bayesiana'}» cargada.`, 'exito');}

export function guardarArchivo(red) {
  if (!red.nodos || red.nodos.length === 0) {
    avisar('La red no tiene nodos para guardar.', 'error');
    return;}

  const nombreArchivo = (red.nombre || 'red-bayesiana').toLowerCase().replace(/[^a-z0-9_-]/g, '-') + '.json';
  const contenidoArchivo = new Blob([JSON.stringify(red, null, 2)], { type: 'application/json' });
  const enlaceDescarga = document.createElement('a');
  enlaceDescarga.href = URL.createObjectURL(contenidoArchivo);
  enlaceDescarga.download = nombreArchivo;
  enlaceDescarga.click();
  URL.revokeObjectURL(enlaceDescarga.href);
  avisar('Archivo JSON descargado.', 'exito');}

export function abrirArchivo(archivoSeleccionado) {
  const lectorArchivo = new FileReader();
  lectorArchivo.onload = () => {
    try {
      const red = JSON.parse(lectorArchivo.result);
      cargarRed(red);
    } catch (error) {
      avisar('Error al procesar el archivo JSON: ' + error.message, 'error');}};
  lectorArchivo.readAsText(archivoSeleccionado);}

export async function cargarEjemplo(rutaArchivo) {
  try {
    const respuesta = await fetch(rutaArchivo, { cache: 'no-store' });
    if (!respuesta.ok) throw new Error(`Código HTTP ${respuesta.status}`);
    const red = await respuesta.json();
    cargarRed(red);
  } catch (error) {
    avisar('No se pudo cargar el ejemplo: ' + error.message, 'error');}}
