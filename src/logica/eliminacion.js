import { multiplicar, marginalizar, restringir, normalizar, reordenar } from './operacionesDeFactores.js';
import { construirFactores, mapaNodosPorId, combinaciones } from './red.js';
import { validarRed } from './validacion.js';

export class ErrorDeConsulta extends Error {
  constructor(mensaje, detalles = []) {
    super(mensaje);
    this.name = 'ErrorDeConsulta';
    this.detalles = detalles;}}

export function eliminacionDeVariables(red, consulta, evidencia = {}, opciones = {}) {
  const resultadoValidacion = validarRed(red);
  if (!resultadoValidacion.esValida) throw new ErrorDeConsulta('La red no es válida.', resultadoValidacion.errores);

  const diccionarioNodos = mapaNodosPorId(red);
  const problemas = [];

  if (!Array.isArray(consulta) || consulta.length === 0) {
    problemas.push('Selecciona al menos una variable de consulta.');
  } else {
    if (new Set(consulta).size !== consulta.length) problemas.push('Hay variables de consulta repetidas.');
    for (const variableConsulta of consulta) {
      if (!diccionarioNodos.has(variableConsulta)) problemas.push(`La variable de consulta "${variableConsulta}" no existe.`);}}

  for (const [variableEvidencia, estadoObservado] of Object.entries(evidencia)) {
    if (!diccionarioNodos.has(variableEvidencia)) {
      problemas.push(`La variable de evidencia "${variableEvidencia}" no existe.`);
    } else if (!diccionarioNodos.get(variableEvidencia).estados.includes(estadoObservado)) {
      problemas.push(`"${estadoObservado}" no es un estado de "${variableEvidencia}".`);}

    if (Array.isArray(consulta) && consulta.includes(variableEvidencia)) {
      problemas.push(`"${variableEvidencia}" no puede ser a la vez variable de consulta y evidencia.`);}}

  if (problemas.length > 0) throw new ErrorDeConsulta('Consulta inválida.', problemas);

  let listaFactores = construirFactores(red);

  for (const [variableEvidencia, estadoObservado] of Object.entries(evidencia)) {
    const posicionEstado = diccionarioNodos.get(variableEvidencia).estados.indexOf(estadoObservado);
    listaFactores = listaFactores.map(factorActual => restringir(factorActual, variableEvidencia, posicionEstado));}

  const variablesOcultas = red.nodos
    .map(nodo => nodo.id)
    .filter(identificador => !consulta.includes(identificador) && !(identificador in evidencia));
  let ordenEliminacion = variablesOcultas;

  if (opciones.orden) {
    if ([...opciones.orden].sort().join('|') !== [...variablesOcultas].sort().join('|')) {
      throw new ErrorDeConsulta('El orden de eliminación debe contener exactamente las variables ocultas.', [
        `Variables ocultas: ${variablesOcultas.join(', ') || '(ninguna)'}`]);}
    ordenEliminacion = opciones.orden;}

  const pasos = [];

  for (const variableOculta of ordenEliminacion) {
    const factoresConVariable = listaFactores.filter(factorActual => factorActual.variables.includes(variableOculta));
    const factoresSinVariable = listaFactores.filter(factorActual => !factorActual.variables.includes(variableOculta));
    const factorProducto = factoresConVariable.reduce((factorAcumulado, factorActual) =>
      multiplicar(factorAcumulado, factorActual));
    const factorMarginalizado = marginalizar(factorProducto, variableOculta);

    pasos.push({
      variable: variableOculta,
      factoresMultiplicados: factoresConVariable.map(factorActual => [...factorActual.variables]),
      variablesDelProducto: [...factorProducto.variables],
      factorResultante: {
        variables: [...factorMarginalizado.variables],
        valores: [...factorMarginalizado.valores]}});
    listaFactores = [...factoresSinVariable, factorMarginalizado];}

  const factorCombinado = listaFactores.reduce((factorAcumulado, factorActual) =>
    multiplicar(factorAcumulado, factorActual));
  const { factor: factorNormalizado, suma: probabilidadEvidencia } = normalizar(reordenar(factorCombinado, consulta));

  if (!(probabilidadEvidencia > 0)) {
    throw new ErrorDeConsulta('La evidencia tiene probabilidad 0, no se puede condicionar sobre ella.');}

  const combinacionesConsulta = combinaciones(
    consulta.map(variableConsulta => diccionarioNodos.get(variableConsulta).estados));

  const distribucion = combinacionesConsulta.map((combinacionEstados, posicionCombinacion) => ({
    asignacion: Object.fromEntries(
      consulta.map((variableConsulta, posicionVariable) => [variableConsulta, combinacionEstados[posicionVariable]])),
    probabilidad: factorNormalizado.valores[posicionCombinacion]}));

  return {
    consulta: [...consulta],
    evidencia: { ...evidencia },
    ordenDeEliminacion: ordenEliminacion,
    probabilidadEvidencia,
    distribucion,
    pasos};}
