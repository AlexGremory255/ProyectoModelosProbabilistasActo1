import { obtener, suscribir, escapar } from '../estado.js';
import { descripcionConsulta } from './consulta.js';

const anchoNodo = 160;
const altoNodo = 58;

function puntoBordeImpresion(centro, destino) {
  const distanciaHorizontal = destino[0] - centro[0];
  const distanciaVertical = destino[1] - centro[1];
  if (Math.abs(distanciaHorizontal) < 1e-4 && Math.abs(distanciaVertical) < 1e-4) return centro;
  const factorEscala = Math.min(
    Math.abs(anchoNodo / 2 / distanciaHorizontal) || Infinity,
    Math.abs(altoNodo / 2 / distanciaVertical) || Infinity);
  return [centro[0] + distanciaHorizontal * factorEscala, centro[1] + distanciaVertical * factorEscala];}

const recortarTexto = (texto, longitudMaxima) =>
  texto.length > longitudMaxima ? texto.slice(0, longitudMaxima - 1) + '…' : texto;

function renderizarGrafoImpresion(red, consulta, evidencia) {
  const listaNodos = red.nodos;
  if (!listaNodos.length) {
    return `<div style="padding: 32px; border: 1px dashed #c8c3b8; text-align: center; color: #706d65; font-size: 12px;">La red no contiene nodos para graficar.</div>`;}

  const posicionesNodos = {};
  listaNodos.forEach((nodo, posicionNodo) => {
    const coordenadas = red.posiciones?.[nodo.id];
    if (Array.isArray(coordenadas) && coordenadas.length >= 2) {
      posicionesNodos[nodo.id] = [Number(coordenadas[0]) || 400, Number(coordenadas[1]) || 240];
    } else {
      const angulo = (posicionNodo * 2 * Math.PI) / listaNodos.length;
      posicionesNodos[nodo.id] = [
        Math.round(400 + 250 * Math.cos(angulo)),
        Math.round(240 + 150 * Math.sin(angulo))];}});

  const coordenadasHorizontales = listaNodos.map(nodo => posicionesNodos[nodo.id][0]);
  const coordenadasVerticales = listaNodos.map(nodo => posicionesNodos[nodo.id][1]);
  const minimoHorizontal = Math.min(...coordenadasHorizontales) - anchoNodo / 2 - 48;
  const maximoHorizontal = Math.max(...coordenadasHorizontales) + anchoNodo / 2 + 48;
  const minimoVertical = Math.min(...coordenadasVerticales) - altoNodo / 2 - 48;
  const maximoVertical = Math.max(...coordenadasVerticales) + altoNodo / 2 + 48;

  const vistaX = Math.min(0, minimoHorizontal);
  const vistaY = Math.min(0, minimoVertical);
  const anchoVista = Math.max(800, maximoHorizontal - vistaX);
  const altoVista = Math.max(460, maximoVertical - vistaY);

  const conjuntoConsulta = new Set(consulta);

  const aristasGrafico = listaNodos
    .flatMap(nodo =>
      (nodo.padres || [])
        .filter(nombrePadre => posicionesNodos[nombrePadre])
        .map(nombrePadre => {
          const posicionHijo = posicionesNodos[nodo.id];
          const posicionPadre = posicionesNodos[nombrePadre];
          const [inicioX, inicioY] = puntoBordeImpresion(posicionPadre, posicionHijo);
          const [finX, finY] = puntoBordeImpresion(posicionHijo, posicionPadre);
          return `<line x1="${inicioX.toFixed(1)}" y1="${inicioY.toFixed(1)}" x2="${finX.toFixed(1)}" y2="${finY.toFixed(1)}" stroke="#4a4843" stroke-width="1.6" marker-end="url(#punta-impresion)"/>`;})
    )
    .join('');

  const nodosGrafico = listaNodos
    .map(nodo => {
      const [centroX, centroY] = posicionesNodos[nodo.id];
      const esConsulta = conjuntoConsulta.has(nodo.id);
      const esEvidencia = nodo.id in evidencia;

      const colorBorde = esConsulta ? '#6d28d9' : esEvidencia ? '#0f766e' : '#262523';
      const colorFondo = esConsulta ? '#f5f3ff' : esEvidencia ? '#f0fdfa' : '#ffffff';
      const colorFranja = esConsulta ? '#6d28d9' : esEvidencia ? '#0f766e' : '#1d4ed8';
      const colorDetalle = esConsulta ? '#6d28d9' : esEvidencia ? '#0f766e' : '#52525b';

      const textoDetalle = esConsulta
        ? 'Consulta (Q)'
        : esEvidencia
        ? `Evidencia = ${evidencia[nodo.id]}`
        : nodo.estados.join(' / ');

      const esquinaX = centroX - anchoNodo / 2;
      const esquinaY = centroY - altoNodo / 2;

      return `
        <g transform="translate(${esquinaX}, ${esquinaY})">
          <rect width="${anchoNodo}" height="${altoNodo}" rx="8" fill="${colorFondo}" stroke="${colorBorde}" stroke-width="${esConsulta || esEvidencia ? '1.8' : '1.2'}"/>
          <rect x="8" y="12" width="3.5" height="${altoNodo - 24}" rx="1.75" fill="${colorFranja}"/>
          <text x="20" y="24" font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" font-size="13" font-weight="700" fill="#141413">${escapar(recortarTexto(nodo.id, 17))}</text>
          <text x="20" y="42" font-family="'IBM Plex Mono', monospace" font-size="10.5" font-weight="${esConsulta || esEvidencia ? '600' : '400'}" fill="${colorDetalle}">${escapar(recortarTexto(textoDetalle, 21))}</text>
        </g>`;})
    .join('');

  return `
    <div style="border: 1px solid #c8c3b8; border-radius: 8px; background: #faf9f6; padding: 16px; margin-bottom: 16px;">
      <svg viewBox="${vistaX} ${vistaY} ${anchoVista} ${altoVista}" style="width: 100%; height: auto; max-height: 460px; display: block; background: #ffffff; border: 1px solid #e5e2da; border-radius: 6px;" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="rejilla-impresion" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.8" fill="#d8d4ca"/>
          </pattern>
          <marker id="punta-impresion" viewBox="0 0 10 10" refX="9.2" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0 1.2 9.5 5 0 8.8z" fill="#4a4843"/>
          </marker>
        </defs>
        <rect x="${vistaX}" y="${vistaY}" width="${anchoVista}" height="${altoVista}" fill="url(#rejilla-impresion)"/>
        <g>${aristasGrafico}</g>
        <g>${nodosGrafico}</g>
      </svg>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 11px; color: #4a4843; font-family: 'IBM Plex Mono', monospace;">
        <div style="display: flex; gap: 18px;">
          <span><b style="color: #1d4ed8;">■</b> Variable estándar / oculta</span>
          <span><b style="color: #6d28d9;">■</b> Variable de consulta (Q)</span>
          <span><b style="color: #0f766e;">■</b> Evidencia observada (e)</span>
        </div>
        <div>Grafo dirigido acíclico · ${listaNodos.length} nodos</div>
      </div>
    </div>`;}

export function iniciar(contenedor) {
  function dibujar() {
    const { red, consulta, evidencia, resultado } = obtener();
    const fechaGeneracion = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' });
    const totalArcos = red.nodos.reduce((acumulado, nodo) => acumulado + (nodo.padres?.length || 0), 0);

    let contenidoImpresion = `
      <div style="border-bottom: 1.5px solid #141413; padding-bottom: 12px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; color: #141413;">
              ${escapar(red.nombre || 'Red Bayesiana')}
            </h1>
            <div style="color: #4a4843; font-size: 12.5px; margin-top: 4px;">
              Reporte de Estructura e Inferencia Probabilística por Eliminación de Variables
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #4a4843; font-family: 'IBM Plex Mono', monospace;">
            Generado: ${escapar(fechaGeneracion)}<br>
            Total Nodos: <b>${red.nodos.length}</b> &nbsp;|&nbsp; Arcos: <b>${totalArcos}</b>
          </div>
        </div>
      </div>

      <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; margin: 16px 0 10px 0; border-bottom: 1px solid #dcd8cf; padding-bottom: 4px;">
        1. Definición de Nodos y Tablas de Probabilidad Condicional (CPT)
      </h2>`;

    for (const nodo of red.nodos) {
      const textoPadres = nodo.padres.length > 0 ? nodo.padres.join(', ') : '(Ninguno - Variable Raíz)';
      contenidoImpresion += `
        <div style="margin-bottom: 16px; page-break-inside: avoid;">
          <h3 style="margin: 6px 0 2px 0; font-size: 13.5px; color: #1d4ed8;">
            Nodo: ${escapar(nodo.id)}
          </h3>
          <div style="font-size: 11.5px; color: #4a4843; margin-bottom: 6px;">
            <b>Estados:</b> [${escapar(nodo.estados.join(', '))}] &nbsp;|&nbsp;
            <b>Padres:</b> ${escapar(textoPadres)}
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px;">
            <thead>
              <tr style="background: #f3f1ec;">
                ${nodo.padres.map(nombrePadre => `<th style="border: 1px solid #c8c3b8; padding: 4px 8px; text-align: left; font-family: monospace;">${escapar(nombrePadre)}</th>`).join('')}
                ${nodo.estados.map(estadoNodo => `<th style="border: 1px solid #c8c3b8; padding: 4px 8px; text-align: right; font-family: monospace;">P(${escapar(estadoNodo)})</th>`).join('')}
              </tr>
            </thead>
            <tbody>`;

      for (const clave of Object.keys(nodo.cpt)) {
        const valoresPadres = nodo.padres.length ? clave.split(',') : [];
        contenidoImpresion += '<tr>';
        valoresPadres.forEach(valorPadre => {
          contenidoImpresion += `<td style="border: 1px solid #dcd8cf; padding: 3px 8px; font-family: monospace; color: #4a4843;">${escapar(valorPadre)}</td>`;});
        nodo.cpt[clave].forEach(probabilidad => {
          contenidoImpresion += `<td style="border: 1px solid #dcd8cf; padding: 3px 8px; text-align: right; font-family: monospace;">${Number(probabilidad).toFixed(4)}</td>`;});
        contenidoImpresion += '</tr>';}

      contenidoImpresion += `
            </tbody>
          </table>
        </div>`;}

    if (resultado) {
      contenidoImpresion += `
        <h2 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; margin: 24px 0 10px 0; border-bottom: 1px solid #dcd8cf; padding-bottom: 4px; page-break-before: auto;">
          2. Consulta de Inferencia Probabilística
        </h2>

        <div style="background: #faf9f6; border: 1px solid #dcd8cf; border-left: 2.5px solid #1d4ed8; padding: 10px 12px; margin-bottom: 14px;">
          <div style="font-size: 14px; font-weight: 600; font-family: monospace; color: #1d4ed8;">
            ${escapar(descripcionConsulta(resultado))}
          </div>
          <div style="font-size: 11.5px; color: #4a4843; margin-top: 6px; font-family: monospace;">
            <b>P(Evidencia):</b> ${resultado.probabilidadEvidencia.toFixed(6)} &nbsp;|&nbsp;
            <b>Variables Ocultas Eliminadas:</b> [${escapar(resultado.ordenDeEliminacion.join(', ') || 'ninguna')}]
          </div>
        </div>

        <h3 style="font-size: 13px; margin: 8px 0;">Distribución Posterior Calculada</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
          <thead>
            <tr style="background: #f3f1ec;">
              <th style="border: 1px solid #c8c3b8; padding: 6px 10px; text-align: left;">Asignación de Consulta</th>
              <th style="border: 1px solid #c8c3b8; padding: 6px 10px; text-align: right;">Probabilidad Posterior</th>
              <th style="border: 1px solid #c8c3b8; padding: 6px 10px; text-align: right;">Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            ${resultado.distribucion
              .map(fila => {
                const textoAsignacion = Object.entries(fila.asignacion)
                  .map(([nombreVariable, valorEstado]) => `${nombreVariable} = ${valorEstado}`)
                  .join(', ');
                return `
                  <tr>
                    <td style="border: 1px solid #dcd8cf; padding: 5px 10px;"><b>${escapar(textoAsignacion)}</b></td>
                    <td style="border: 1px solid #dcd8cf; padding: 5px 10px; text-align: right; font-family: monospace;">${fila.probabilidad.toFixed(6)}</td>
                    <td style="border: 1px solid #dcd8cf; padding: 5px 10px; text-align: right; font-family: monospace;">${(fila.probabilidad * 100).toFixed(2)}%</td>
                  </tr>`;})
              .join('')}
          </tbody>
        </table>

        ${
          resultado.pasos.length > 0
            ? `
          <h3 style="font-size: 13px; margin: 8px 0;">Traza de Factores (Eliminación de Variables)</h3>
          <ol style="font-size: 11px; line-height: 1.6; color: #444; padding-left: 20px;">
            ${resultado.pasos
              .map(
                paso => `
              <li>
                Eliminación de variable oculta <b>${escapar(paso.variable)}</b>:
                Multiplica ${paso.factoresMultiplicados.map(variablesFactor => `f(${escapar(variablesFactor.join(','))})`).join(' · ')}
                y suma sobre ${escapar(paso.variable)} &rarr; Factor resultante: <b>f(${escapar(paso.factorResultante.variables.join(','))})</b>
              </li>`)
              .join('')}
          </ol>`
            : ''}`;}

    const numeroSeccionGrafo = resultado ? 3 : 2;
    contenidoImpresion += `
      <div style="page-break-before: always; break-before: page; page-break-inside: avoid;">
        <div style="border-bottom: 1.5px solid #141413; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h2 style="margin: 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #141413;">
              ${numeroSeccionGrafo}. Distribución Gráfica de la Red Bayesiana
            </h2>
            <div style="color: #4a4843; font-size: 12px; margin-top: 3px;">
              Topología dirigida acíclica y estados de variables de «${escapar(red.nombre || 'Red Bayesiana')}»
            </div>
          </div>
          <div style="font-size: 11px; color: #4a4843; font-family: 'IBM Plex Mono', monospace;">
            Nodos: <b>${red.nodos.length}</b> &nbsp;|&nbsp; Relaciones: <b>${totalArcos}</b>
          </div>
        </div>

        ${renderizarGrafoImpresion(red, consulta, evidencia)}

        <h3 style="font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.04em; margin: 18px 0 8px 0; color: #141413;">
          Resumen de Relaciones de Dependencia
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #f3f1ec;">
              <th style="border: 1px solid #c8c3b8; padding: 5px 8px; text-align: left; width: 6%;">#</th>
              <th style="border: 1px solid #c8c3b8; padding: 5px 8px; text-align: left; width: 22%;">Nodo</th>
              <th style="border: 1px solid #c8c3b8; padding: 5px 8px; text-align: left; width: 26%;">Estados Posibles</th>
              <th style="border: 1px solid #c8c3b8; padding: 5px 8px; text-align: left; width: 26%;">Depende de (Padres)</th>
              <th style="border: 1px solid #c8c3b8; padding: 5px 8px; text-align: left; width: 20%;">Papel en Consulta</th>
            </tr>
          </thead>
          <tbody>
            ${red.nodos
              .map((nodo, posicionNodo) => {
                const papelEnConsulta = consulta.includes(nodo.id)
                  ? 'Consulta (Q)'
                  : nodo.id in evidencia
                  ? `Evidencia (${nodo.id} = ${evidencia[nodo.id]})`
                  : 'Oculta / No observada';
                return `
                  <tr>
                    <td style="border: 1px solid #dcd8cf; padding: 4px 8px; font-family: monospace; color: #4a4843;">${String(posicionNodo + 1).padStart(2, '0')}</td>
                    <td style="border: 1px solid #dcd8cf; padding: 4px 8px; font-weight: 600;">${escapar(nodo.id)}</td>
                    <td style="border: 1px solid #dcd8cf; padding: 4px 8px; font-family: monospace;">${escapar(nodo.estados.join(', '))}</td>
                    <td style="border: 1px solid #dcd8cf; padding: 4px 8px;">${nodo.padres.length ? escapar(nodo.padres.join(', ')) : '<span style="color:#706d65">Raíz (sin padres)</span>'}</td>
                    <td style="border: 1px solid #dcd8cf; padding: 4px 8px; font-family: monospace;">${escapar(papelEnConsulta)}</td>
                  </tr>`;})
              .join('')}
          </tbody>
        </table>
      </div>`;

    contenedor.innerHTML = contenidoImpresion;}

  suscribir(dibujar);
  window.addEventListener('beforeprint', dibujar);
  dibujar();}
