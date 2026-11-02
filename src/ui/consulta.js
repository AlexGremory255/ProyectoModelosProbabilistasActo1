import { obtener, suscribir, actualizar, asignarPapel, limpiarConsulta, escapar } from '../estado.js';
import { eliminacionDeVariables, ErrorDeConsulta } from '../logica/eliminacion.js';
import { iconos } from './dialogos.js';

const iconoFlecha = '<svg class="acordeon-flecha" viewBox="0 0 16 16" aria-hidden="true"><path class="trazo-h" d="M3 7.5h10v1H3z"/><path class="trazo-v" d="M7.5 3h1v10h-1z"/></svg>';

let mensajeError = null;
let pasosAbiertos = false;

export function descripcionConsulta({ consulta, evidencia }) {
  const variablesConsulta = consulta.join(', ');
  const variablesEvidencia = Object.entries(evidencia)
    .map(([nombreVariable, estadoObservado]) => `${nombreVariable} = ${estadoObservado}`)
    .join(', ');
  return `P(${variablesConsulta}${variablesEvidencia ? ' | ' + variablesEvidencia : ''})`;}

function formulaEnVivo(consulta, evidencia) {
  if (!consulta.length) {
    return '<span class="tenue">P( elige al menos una variable de consulta )</span>';}
  const listaEvidencia = Object.entries(evidencia).map(
    ([nombreVariable, estadoObservado]) => `${escapar(nombreVariable)} = ${escapar(estadoObservado)}`);
  return `P(${consulta.map(escapar).join(', ')}${listaEvidencia.length ? ' <span class="tenue">|</span> ' + listaEvidencia.join(', ') : ''})`;}

function seccionResultado(resultado) {
  const probabilidadMaxima = Math.max(...resultado.distribucion.map(entrada => entrada.probabilidad));
  const tieneVariasFilas = resultado.distribucion.length > 1;

  const filasResultado = resultado.distribucion
    .map(fila => {
      const textoAsignacion = Object.entries(fila.asignacion)
        .map(([nombreVariable, valorEstado]) =>
          resultado.consulta.length > 1 ? `${nombreVariable} = ${valorEstado}` : valorEstado)
        .join(', ');
      const esMaximo = tieneVariasFilas && Math.abs(fila.probabilidad - probabilidadMaxima) < 1e-9;
      const porcentaje = fila.probabilidad * 100;
      return `
        <tr class="resultado-fila ${esMaximo ? 'maximo' : ''}">
          <td>${escapar(textoAsignacion)}${esMaximo ? '<span class="etiqueta-maximo">Más probable</span>' : ''}</td>
          <td style="width:40%"><div class="barra-prob" role="presentation"><span style="width:${porcentaje.toFixed(2)}%"></span></div></td>
          <td class="numero">${fila.probabilidad.toFixed(4)}<br><span class="ayuda">${porcentaje.toFixed(2)} %</span></td>
        </tr>`;})
    .join('');

  const listaPasos = resultado.pasos.length
    ? resultado.pasos
        .map(
          paso => `
        <li>
          Eliminar <strong>${escapar(paso.variable)}</strong>
          <span class="ayuda">Multiplicar <span class="mono">${paso.factoresMultiplicados.map(variablesFactor => `f(${escapar(variablesFactor.join(', '))})`).join(' · ')}</span></span>
          <span class="ayuda">Sumar sobre ${escapar(paso.variable)} → <span class="mono">f(${escapar(paso.factorResultante.variables.join(', ')) || '∅'})</span></span>
        </li>`)
        .join('')
    : '<li>No hubo variables ocultas: todas son de consulta o evidencia.</li>';

  return `
    <div class="seccion seccion-resultado" id="seccionResultado">
      <div class="seccion-encabezado">
        <h3 class="seccion-titulo">Resultado</h3>
      </div>
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead>
            <tr>
              <th>${escapar(resultado.consulta.length === 1 ? resultado.consulta[0] : 'Asignación')}</th>
              <th></th>
              <th class="numero">Probabilidad</th>
            </tr>
          </thead>
          <tbody>${filasResultado}</tbody>
        </table>
      </div>
      <div class="datos">
        <div class="dato">
          <div class="etiqueta">Probabilidad de la evidencia</div>
          <div class="dato-valor">${resultado.probabilidadEvidencia.toFixed(6)}</div>
        </div>
        <div class="dato">
          <div class="etiqueta">Variables eliminadas</div>
          <div class="dato-valor">${resultado.ordenDeEliminacion.length}</div>
        </div>
      </div>
    </div>
    <details class="acordeon" id="detallePasos" style="margin:20px -16px 0" ${pasosAbiertos ? 'open' : ''}>
      <summary>Desarrollo paso a paso <span class="acordeon-extra">${resultado.pasos.length} ${resultado.pasos.length === 1 ? 'paso' : 'pasos'}</span>${iconoFlecha}</summary>
      <div class="acordeon-contenido">
        <p class="ayuda" style="margin-bottom:4px">Orden de eliminación: ${escapar(resultado.ordenDeEliminacion.join(' → ') || 'ninguno')}</p>
        <ol class="pasos">${listaPasos}</ol>
        <p class="ayuda" style="margin-top:12px">Al final se multiplican los factores restantes y se normaliza dividiendo entre la probabilidad de la evidencia.</p>
      </div>
    </details>`;}

export function iniciar(contenedor) {
  function dibujar(origen) {
    if (origen === 'nombre' || origen === 'posicion') return;
    const { red, errores, consulta, evidencia, resultado } = obtener();
    const conjuntoConsulta = new Set(consulta);
    const hayNodos = red.nodos.length > 0;
    const redBloqueada = errores.length > 0;
    const haySeleccion = consulta.length > 0 || Object.keys(evidencia).length > 0;

    let contenidoCuerpo;
    if (!hayNodos) {
      contenidoCuerpo = `<div class="vacio"><strong>Sin variables</strong>Cuando la red tenga nodos podrás elegir qué quieres calcular y qué observaste.</div>`;
    } else {
      const filasVariables = red.nodos
        .map(nodo => {
          const papelActual = conjuntoConsulta.has(nodo.id) ? 'consulta' : evidencia[nodo.id] ?? 'oculta';
          const claseFila =
            papelActual === 'consulta' ? 'es-consulta' : papelActual === 'oculta' ? '' : 'es-evidencia';
          return `
            <tr class="${claseFila}">
              <td>${escapar(nodo.id)}</td>
              <td>
                <select class="lista lista-chica" data-papel="${escapar(nodo.id)}" aria-label="Papel de ${escapar(nodo.id)}">
                  <option value="oculta" ${papelActual === 'oculta' ? 'selected' : ''}>Oculta</option>
                  <option value="consulta" ${papelActual === 'consulta' ? 'selected' : ''}>Consultar</option>
                  <optgroup label="Observada como">
                    ${nodo.estados
                      .map(
                        estadoNodo =>
                          `<option value="${escapar(estadoNodo)}" ${papelActual === estadoNodo ? 'selected' : ''}>${escapar(estadoNodo)}</option>`)
                      .join('')}
                  </optgroup>
                </select>
              </td>
            </tr>`;})
        .join('');

      contenidoCuerpo = `
        <div class="seccion" style="margin-top:0">
          <div class="seccion-encabezado">
            <h3 class="seccion-titulo">Variables</h3>
            ${haySeleccion ? '<button type="button" id="btnLimpiar" class="boton-enlace">Restablecer</button>' : ''}
          </div>
          <p class="ayuda" style="margin-bottom:12px">Elige qué quieres calcular y qué valores observaste. El resto se elimina.</p>
          <div class="tabla-contenedor">
            <table class="tabla tabla-compacta tabla-papeles">
              <thead><tr><th>Variable</th><th>Papel</th></tr></thead>
              <tbody>${filasVariables}</tbody>
            </table>
          </div>
        </div>

        <div class="seccion">
          <div class="etiqueta" style="margin-bottom:8px">Consulta</div>
          <div class="formula">${formulaEnVivo(consulta, evidencia)}</div>
        </div>

        ${
          redBloqueada
            ? `<div class="aviso aviso-advertencia" style="margin-top:16px">${iconos.info}<p>Corrige la red en el panel izquierdo para poder calcular.</p></div>`
            : ''}
        ${
          mensajeError
            ? `<div class="aviso aviso-error" role="alert" style="margin-top:16px">${iconos.error}<p>${escapar(mensajeError)}</p></div>`
            : ''}

        <button id="botonCalcular" type="button" class="boton boton-primario boton-bloque" style="margin-top:16px" ${redBloqueada || !consulta.length ? 'disabled' : ''}>
          Calcular
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.3 3.3 8.6 4l3.5 3.5H2v1h10.1L8.6 12l.7.7L14 8z"/></svg>
        </button>

        ${resultado ? seccionResultado(resultado) : ''}`;}

    contenedor.innerHTML = `
      <div class="panel-encabezado">
        <div>
          <h2 class="panel-titulo">Consulta</h2>
          <p class="panel-subtitulo">Eliminación de variables</p>
        </div>
      </div>
      <div class="panel-cuerpo">${contenidoCuerpo}</div>`;

    contenedor.querySelectorAll('[data-papel]').forEach(selectorPapel => {
      selectorPapel.onchange = () => {
        mensajeError = null;
        asignarPapel(selectorPapel.dataset.papel, selectorPapel.value);};});

    const botonLimpiar = contenedor.querySelector('#btnLimpiar');
    if (botonLimpiar) {
      botonLimpiar.onclick = () => {
        mensajeError = null;
        limpiarConsulta();};}

    contenedor.querySelector('#detallePasos')?.addEventListener('toggle', evento => {
      pasosAbiertos = evento.target.open;});

    const botonCalcular = contenedor.querySelector('#botonCalcular');
    if (botonCalcular) {
      botonCalcular.onclick = () => {
        mensajeError = null;
        try {
          const resultadoCalculado = eliminacionDeVariables(red, [...consulta], { ...evidencia });
          actualizar({ resultado: resultadoCalculado });
          requestAnimationFrame(() =>
            contenedor.querySelector('#seccionResultado')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
        } catch (error) {
          mensajeError =
            error instanceof ErrorDeConsulta && error.detalles?.length
              ? `${error.message}: ${error.detalles.join(', ')}`
              : error.message;
          actualizar({ resultado: null });}};}}

  suscribir(dibujar);
  dibujar();}
