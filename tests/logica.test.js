import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { eliminacionDeVariables, ErrorDeConsulta } from '../src/logica/eliminacion.js';
import { enumerar } from '../src/logica/calculoPorEnumeracion.js';
import { validarRed } from '../src/logica/validacion.js';
import { combinaciones } from '../src/logica/red.js';

const cargarRedEjemplo = nombreArchivo =>
  JSON.parse(readFileSync(new URL(`../ejemplos/${nombreArchivo}`, import.meta.url), 'utf8'));

const verificarCercania = (valorObtenido, valorEsperado, tolerancia = 1e-9) =>
  assert.ok(
    Math.abs(valorObtenido - valorEsperado) <= tolerancia,
    `se esperaba ${valorEsperado} y se obtuvo ${valorObtenido} (tolerancia ${tolerancia})`);

const buscarProbabilidad = (resultado, asignacionBuscada) =>
  resultado.distribucion.find(fila =>
    Object.entries(asignacionBuscada).every(([nombreVariable, valorEstado]) => fila.asignacion[nombreVariable] === valorEstado)
  ).probabilidad;

test('cadena de 3 nodos: P(A | C=si) coincide con el cálculo manual', () => {
  const red = cargarRedEjemplo('cadena-3-nodos.json');
  assert.deepEqual(validarRed(red), { esValida: true, errores: [] });

  const resultado = eliminacionDeVariables(red, ['A'], { C: 'si' });
  verificarCercania(resultado.probabilidadEvidencia, 0.346);
  verificarCercania(buscarProbabilidad(resultado, { A: 'si' }), 0.192 / 0.346);
  verificarCercania(buscarProbabilidad(resultado, { A: 'no' }), 0.154 / 0.346);
  assert.deepEqual(resultado.ordenDeEliminacion, ['B']);
  assert.equal(resultado.pasos.length, 1);});

test('alarma de 5 nodos: P(Robo | Juan=si, Maria=si) ≈ 0.284', () => {
  const red = cargarRedEjemplo('alarma-5-nodos.json');
  assert.equal(validarRed(red).esValida, true);
  const resultado = eliminacionDeVariables(red, ['Robo'], { JuanLlama: 'si', MariaLlama: 'si' });
  verificarCercania(buscarProbabilidad(resultado, { Robo: 'si' }), 0.2842, 5e-4);
  verificarCercania(buscarProbabilidad(resultado, { Robo: 'no' }), 0.7158, 5e-4);

  const referencia = enumerar(red, ['Robo'], { JuanLlama: 'si', MariaLlama: 'si' });
  verificarCercania(buscarProbabilidad(resultado, { Robo: 'si' }), buscarProbabilidad(referencia, { Robo: 'si' }));
  verificarCercania(resultado.probabilidadEvidencia, referencia.probabilidadEvidencia);});

test('sin evidencia, la marginal suma 1 y P(e) = 1', () => {
  const red = cargarRedEjemplo('alarma-5-nodos.json');
  const resultado = eliminacionDeVariables(red, ['Alarma']);
  verificarCercania(
    resultado.distribucion.reduce((acumulado, fila) => acumulado + fila.probabilidad, 0),
    1);
  verificarCercania(resultado.probabilidadEvidencia, 1);});

test('consulta con dos variables', () => {
  const red = cargarRedEjemplo('alarma-5-nodos.json');
  const resultado = eliminacionDeVariables(red, ['Robo', 'Terremoto'], { MariaLlama: 'si' });
  assert.equal(resultado.distribucion.length, 4);
  verificarCercania(
    resultado.distribucion.reduce((acumulado, fila) => acumulado + fila.probabilidad, 0),
    1);
  const referencia = enumerar(red, ['Robo', 'Terremoto'], { MariaLlama: 'si' });
  resultado.distribucion.forEach((fila, posicionFila) =>
    verificarCercania(fila.probabilidad, referencia.distribucion[posicionFila].probabilidad));});

test('validación: menos de 3 nodos y más de 10 nodos', () => {
  const red = cargarRedEjemplo('cadena-3-nodos.json');
  const redPequena = structuredClone(red);
  redPequena.nodos = redPequena.nodos.slice(0, 2);
  assert.ok(validarRed(redPequena).errores.some(mensajeError => mensajeError.includes('mínimo')));

  const redGrande = structuredClone(red);
  redGrande.nodos = Array.from({ length: 11 }, (_, posicionNodo) => ({
    id: `N${posicionNodo}`,
    estados: ['a', 'b'],
    padres: [],
    cpt: { '': [0.5, 0.5] }}));
  assert.ok(validarRed(redGrande).errores.some(mensajeError => mensajeError.includes('máximo')));});

test('validación: ciclo en el grafo', () => {
  const red = cargarRedEjemplo('cadena-3-nodos.json');
  red.nodos[0].padres = ['C'];
  red.nodos[0].cpt = { si: [0.5, 0.5], no: [0.5, 0.5] };
  const { esValida, errores } = validarRed(red);
  assert.equal(esValida, false);
  assert.ok(errores.some(mensajeError => mensajeError.includes('ciclo')));});

test('validación: fila de CPT que no suma 1, fila faltante, padre inexistente y estados repetidos', () => {
  const redBase = cargarRedEjemplo('cadena-3-nodos.json');

  const redSinSumaUno = structuredClone(redBase);
  redSinSumaUno.nodos[1].cpt.si = [0.5, 0.4];
  assert.ok(validarRed(redSinSumaUno).errores.some(mensajeError => mensajeError.includes('debe sumar 1')));

  const redConFilaFaltante = structuredClone(redBase);
  delete redConFilaFaltante.nodos[2].cpt.no;
  assert.ok(validarRed(redConFilaFaltante).errores.some(mensajeError => mensajeError.includes('no tiene la fila')));

  const redSinPadre = structuredClone(redBase);
  redSinPadre.nodos[2].padres = ['Z'];
  assert.ok(validarRed(redSinPadre).errores.some(mensajeError => mensajeError.includes('padre inexistente')));

  const redConEstadosRepetidos = structuredClone(redBase);
  redConEstadosRepetidos.nodos[0].estados = ['si', 'si'];
  assert.ok(validarRed(redConEstadosRepetidos).errores.some(mensajeError => mensajeError.includes('repetido')));

  const redConIdRepetido = structuredClone(redBase);
  redConIdRepetido.nodos[1].id = 'A';
  assert.ok(validarRed(redConIdRepetido).errores.some(mensajeError => mensajeError.includes('repetido')));});

test('consultas inválidas lanzan ErrorDeConsulta', () => {
  const red = cargarRedEjemplo('cadena-3-nodos.json');
  assert.throws(() => eliminacionDeVariables(red, [], {}), ErrorDeConsulta);
  assert.throws(() => eliminacionDeVariables(red, ['X'], {}), ErrorDeConsulta);
  assert.throws(() => eliminacionDeVariables(red, ['A'], { C: 'quizas' }), ErrorDeConsulta);
  assert.throws(() => eliminacionDeVariables(red, ['A'], { A: 'si' }), ErrorDeConsulta);
  assert.throws(() => eliminacionDeVariables(red, ['A'], { C: 'si' }, { orden: ['A'] }), ErrorDeConsulta);});

test('evidencia con probabilidad 0 se informa como error', () => {
  const red = cargarRedEjemplo('cadena-3-nodos.json');
  red.nodos[0].cpt = { '': [1, 0] };
  assert.throws(() => eliminacionDeVariables(red, ['B'], { A: 'no' }), ErrorDeConsulta);});

function crearGeneradorAleatorio(semillaInicial) {
  let estadoSemilla = semillaInicial >>> 0;
  return () => {
    estadoSemilla = (estadoSemilla + 0x6d2b79f5) >>> 0;
    let mezcla = estadoSemilla;
    mezcla = Math.imul(mezcla ^ (mezcla >>> 15), mezcla | 1);
    mezcla ^= mezcla + Math.imul(mezcla ^ (mezcla >>> 7), mezcla | 61);
    return ((mezcla ^ (mezcla >>> 14)) >>> 0) / 4294967296;};}

function generarRedAleatoria(obtenerAleatorio) {
  const cantidadNodos = 3 + Math.floor(obtenerAleatorio() * 8);
  const listaNodos = [];
  for (let posicionNodo = 0; posicionNodo < cantidadNodos; posicionNodo++) {
    const estados = Array.from(
      { length: 2 + Math.floor(obtenerAleatorio() * 2) },
      (_, posicionEstado) => `e${posicionEstado}`);
    const padres = [];
    for (let posicionPadre = 0; posicionPadre < posicionNodo && padres.length < 3; posicionPadre++) {
      if (obtenerAleatorio() < 0.4) padres.push(`N${posicionPadre}`);}
    const tablaCpt = {};
    const obtenerEstadosDe = identificador => listaNodos.find(nodo => nodo.id === identificador).estados;
    for (const combinacionPadres of combinaciones(padres.map(obtenerEstadosDe))) {
      const pesos = estados.map(() => 0.05 + obtenerAleatorio());
      const sumaPesos = pesos.reduce((acumulado, pesoActual) => acumulado + pesoActual, 0);
      tablaCpt[combinacionPadres.join(',')] = pesos.map(pesoActual => pesoActual / sumaPesos);}
    listaNodos.push({ id: `N${posicionNodo}`, estados, padres, cpt: tablaCpt });}
  return { nombre: 'aleatoria', nodos: listaNodos };}

test('300 redes aleatorias (3 a 10 nodos): eliminación de variables == enumeración', () => {
  const obtenerAleatorio = crearGeneradorAleatorio(2026);
  for (let numeroCaso = 0; numeroCaso < 300; numeroCaso++) {
    const red = generarRedAleatoria(obtenerAleatorio);
    assert.equal(validarRed(red).esValida, true, `caso ${numeroCaso}: la red generada debe ser válida`);
    const identificadores = red.nodos.map(nodo => nodo.id);

    const evidencia = {};
    for (const nodo of red.nodos) {
      if (obtenerAleatorio() < 0.3 && Object.keys(evidencia).length < identificadores.length - 2) {
        evidencia[nodo.id] = nodo.estados[Math.floor(obtenerAleatorio() * nodo.estados.length)];}}

    const variablesLibres = identificadores.filter(identificador => !(identificador in evidencia));
    const consulta = [variablesLibres[Math.floor(obtenerAleatorio() * variablesLibres.length)]];
    if (obtenerAleatorio() < 0.4) {
      const otraVariable = variablesLibres[Math.floor(obtenerAleatorio() * variablesLibres.length)];
      if (!consulta.includes(otraVariable)) consulta.push(otraVariable);}

    const resultado = eliminacionDeVariables(red, consulta, evidencia);
    const referencia = enumerar(red, consulta, evidencia);
    verificarCercania(resultado.probabilidadEvidencia, referencia.probabilidadEvidencia, 1e-9);
    assert.equal(resultado.distribucion.length, referencia.distribucion.length);
    resultado.distribucion.forEach((fila, posicionFila) => {
      assert.deepEqual(fila.asignacion, referencia.distribucion[posicionFila].asignacion);
      verificarCercania(fila.probabilidad, referencia.distribucion[posicionFila].probabilidad, 1e-9);});

    const variablesOcultas = identificadores.filter(
      identificador => !consulta.includes(identificador) && !(identificador in evidencia));
    for (let posicionActual = variablesOcultas.length - 1; posicionActual > 0; posicionActual--) {
      const posicionAleatoria = Math.floor(obtenerAleatorio() * (posicionActual + 1));
      [variablesOcultas[posicionActual], variablesOcultas[posicionAleatoria]] = [
        variablesOcultas[posicionAleatoria],
        variablesOcultas[posicionActual]];}

    const resultadoOrdenAlterno = eliminacionDeVariables(red, consulta, evidencia, { orden: variablesOcultas });
    resultadoOrdenAlterno.distribucion.forEach((fila, posicionFila) =>
      verificarCercania(fila.probabilidad, referencia.distribucion[posicionFila].probabilidad, 1e-9));}});
