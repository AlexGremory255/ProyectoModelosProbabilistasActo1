import { Factor } from './operacionesDeFactores.js';

export const separadorClave = ',';

export function combinaciones(listasDeEstados) {
  let resultadoCombinaciones = [[]];
  for (const listaActual of listasDeEstados) {
    resultadoCombinaciones = resultadoCombinaciones.flatMap(combinacionParcial =>
      listaActual.map(estadoActual => [...combinacionParcial, estadoActual]));}
  return resultadoCombinaciones;}

export function claveCpt(estadosPadres) {
  return estadosPadres.join(separadorClave);}

export function mapaNodosPorId(red) {
  return new Map(red.nodos.map(nodo => [nodo.id, nodo]));}

export function construirFactores(red) {
  const diccionarioNodos = mapaNodosPorId(red);

  return red.nodos.map(nodo => {
    const padresNodo = nodo.padres ?? [];
    const cardinalidades = [
      ...padresNodo.map(nombrePadre => diccionarioNodos.get(nombrePadre).estados.length),
      nodo.estados.length];
    const valoresFactor = [];

    for (const combinacionPadres of combinaciones(padresNodo.map(nombrePadre => diccionarioNodos.get(nombrePadre).estados))) {
      valoresFactor.push(...nodo.cpt[claveCpt(combinacionPadres)]);}

    return new Factor([...padresNodo, nodo.id], cardinalidades, valoresFactor);});}
