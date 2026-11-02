export class Factor {
  constructor(variables, cardinalidades, valores) {
    if (valores.length !== calcularTamano(cardinalidades)) throw new Error(`Factor inválido: se esperaban ${calcularTamano(cardinalidades)} valores y llegaron ${valores.length}.`);
    this.variables = variables;
    this.cardinalidades = cardinalidades;
    this.valores = valores;}}

export function calcularTamano(cardinalidades) {
  return cardinalidades.reduce((productoTotal, cardinalidad) => productoTotal * cardinalidad, 1);}

function recorrerAsignaciones(variables, cardinalidades, alRecorrer) {
  const indicesEstados = variables.map(() => 0);
  const totalEntradas = calcularTamano(cardinalidades);

  for (let posicionPlana = 0; posicionPlana < totalEntradas; posicionPlana++) {
    const asignacionActual = Object.fromEntries(
      variables.map((nombreVariable, posicionVariable) => [nombreVariable, indicesEstados[posicionVariable]]));
    alRecorrer(asignacionActual, posicionPlana);

    for (let posicionVariable = indicesEstados.length - 1; posicionVariable >= 0; posicionVariable--) {
      indicesEstados[posicionVariable]++;
      if (indicesEstados[posicionVariable] < cardinalidades[posicionVariable]) break;
      indicesEstados[posicionVariable] = 0;}}}

function obtenerIndicePlano(factor, asignacion) {
  return factor.variables.reduce(
    (indiceAcumulado, nombreVariable, posicionVariable) =>
      indiceAcumulado * factor.cardinalidades[posicionVariable] + asignacion[nombreVariable],
    0);}

export function multiplicar(primerFactor, segundoFactor) {
  const variablesUnidas = [...primerFactor.variables];
  const cardinalidadesUnidas = [...primerFactor.cardinalidades];

  segundoFactor.variables.forEach((nombreVariable, posicionVariable) => {
    if (!variablesUnidas.includes(nombreVariable)) {
      variablesUnidas.push(nombreVariable);
      cardinalidadesUnidas.push(segundoFactor.cardinalidades[posicionVariable]);}});

  const valoresMultiplicados = [];
  recorrerAsignaciones(variablesUnidas, cardinalidadesUnidas, asignacion => {
    const valorPrimero = primerFactor.valores[obtenerIndicePlano(primerFactor, asignacion)];
    const valorSegundo = segundoFactor.valores[obtenerIndicePlano(segundoFactor, asignacion)];
    valoresMultiplicados.push(valorPrimero * valorSegundo);});

  return new Factor(variablesUnidas, cardinalidadesUnidas, valoresMultiplicados);}

function filtrarVariable(factor, variableObjetivo, aceptaEstado) {
  if (!factor.variables.includes(variableObjetivo)) return factor;

  const posicionObjetivo = factor.variables.indexOf(variableObjetivo);
  const variablesRestantes = factor.variables.filter((_, posicionActual) => posicionActual !== posicionObjetivo);
  const cardinalidadesRestantes = factor.cardinalidades.filter((_, posicionActual) => posicionActual !== posicionObjetivo);
  const factorResultado = new Factor(
    variablesRestantes,
    cardinalidadesRestantes,
    new Array(calcularTamano(cardinalidadesRestantes)).fill(0));

  recorrerAsignaciones(factor.variables, factor.cardinalidades, (asignacion, posicionPlana) => {
    if (aceptaEstado(asignacion[variableObjetivo])) {
      factorResultado.valores[obtenerIndicePlano(factorResultado, asignacion)] += factor.valores[posicionPlana];}});

  return factorResultado;}

export function marginalizar(factor, variableObjetivo) {
  return filtrarVariable(factor, variableObjetivo, () => true);}

export function restringir(factor, variableObjetivo, indiceEstadoObservado) {
  return filtrarVariable(factor, variableObjetivo, estadoActual => estadoActual === indiceEstadoObservado);}

export function reordenar(factor, nuevoOrden) {
  if (
    nuevoOrden.length !== factor.variables.length ||
    nuevoOrden.some(nombreVariable => !factor.variables.includes(nombreVariable))
  ) {
    throw new Error('reordenar: el nuevo orden debe tener exactamente las mismas variables.');}

  const cardinalidadesOrdenadas = nuevoOrden.map(
    nombreVariable => factor.cardinalidades[factor.variables.indexOf(nombreVariable)]);
  const valoresOrdenados = [];
  recorrerAsignaciones(nuevoOrden, cardinalidadesOrdenadas, asignacion => {
    valoresOrdenados.push(factor.valores[obtenerIndicePlano(factor, asignacion)]);});

  return new Factor([...nuevoOrden], cardinalidadesOrdenadas, valoresOrdenados);}

export function normalizar(factor) {
  const sumaTotal = factor.valores.reduce((acumulado, valorActual) => acumulado + valorActual, 0);
  if (!(sumaTotal > 0)) return { factor, suma: sumaTotal };
  const valoresNormalizados = factor.valores.map(valorActual => valorActual / sumaTotal);
  return {
    factor: new Factor(factor.variables, factor.cardinalidades, valoresNormalizados),
    suma: sumaTotal};}
