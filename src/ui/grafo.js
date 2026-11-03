import { obtener, suscribir, actualizar, autoOrganizarNodos } from '../estado.js';

const anchoLienzo = 800;
const altoLienzo = 480;
const anchoNodo = 160;
const altoNodo = 58;
const espacioNombresSvg = 'http://www.w3.org/2000/svg';

function puntoEnBorde(centro, destino) {
  const distanciaHorizontal = destino[0] - centro[0];
  const distanciaVertical = destino[1] - centro[1];
  if (Math.abs(distanciaHorizontal) < 1e-4 && Math.abs(distanciaVertical) < 1e-4) return centro;
  const factorEscala = Math.min(
    Math.abs(anchoNodo / 2 / distanciaHorizontal) || Infinity,
    Math.abs(altoNodo / 2 / distanciaVertical) || Infinity);
  return [centro[0] + distanciaHorizontal * factorEscala, centro[1] + distanciaVertical * factorEscala];}

const recortarTexto = (texto, longitudMaxima) =>
  texto.length > longitudMaxima ? texto.slice(0, longitudMaxima - 1) + '…' : texto;

export function iniciar(contenedor, { alAgregarNodo } = {}) {
  contenedor.innerHTML = `
    <div class="grafo-encabezado">
      <div class="panel-titulo">
        Grafo
        <span id="grafoResumen" class="acordeon-extra" style="margin-left:8px"></span>
      </div>
      <button id="btnAutoOrganizar" type="button" class="boton boton-fantasma boton-chico" title="Acomodar por niveles, de causas a efectos">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1h4v3H6zM1 12h4v3H1zm10 0h4v3h-4zM7.5 4h1v3.5H13V12h-1V8.5H4V12H3V7.5h4.5z"/></svg>
        Ordenar
      </button>
      <button id="btnCentrar" type="button" class="boton boton-fantasma boton-chico" title="Centrar el grafo">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM7.5 0h1v3h-1zm0 13h1v3h-1zM0 7.5h3v1H0zm13 0h3v1h-3z"/></svg>
        Centrar
      </button>
    </div>
    <div class="grafo-area">
      <svg id="svgGrafo" viewBox="0 0 ${anchoLienzo} ${altoLienzo}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Grafo dirigido de la red">
        <defs>
          <pattern id="rejilla" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.9" fill="#24242c"/>
          </pattern>
          <marker id="punta" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0 1.5 9.5 5 0 8.5z" fill="#52525b"/>
          </marker>
          <marker id="punta-activa" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
            <path d="M0 1.5 9.5 5 0 8.5z" fill="#60a5fa"/>
          </marker>
        </defs>
        <rect x="-2000" y="-2000" width="4800" height="4480" fill="url(#rejilla)"/>
        <g id="capaAristas"></g>
        <g id="capaNodos"></g>
      </svg>
      <div id="grafoVacio" class="grafo-vacio" hidden>
        <h2>La red está vacía</h2>
        <p>Agrega nodos desde el panel de la izquierda y marca de qué otros nodos dependen. También puedes abrir uno de los ejemplos.</p>
        <button id="btnPrimerNodo" type="button" class="boton boton-primario">Agregar el primer nodo</button>
      </div>
      <div id="leyenda" class="leyenda" hidden>
        <span><i style="background:var(--papel-consulta)"></i>Consulta</span>
        <span><i style="background:var(--papel-evidencia)"></i>Evidencia</span>
        <span><i style="background:#525252"></i>Oculta, se elimina</span>
      </div>
    </div>`;

  const elementoSvg = contenedor.querySelector('#svgGrafo');
  const capaAristas = elementoSvg.querySelector('#capaAristas');
  const capaNodos = elementoSvg.querySelector('#capaNodos');
  const mensajeVacio = contenedor.querySelector('#grafoVacio');
  const leyenda = contenedor.querySelector('#leyenda');
  const resumenGrafo = contenedor.querySelector('#grafoResumen');
  let nodoArrastrado = null;
  let huboMovimiento = false;
  let desfaseCursor = [0, 0];
  let identificadorAnimacion = null;

  function crearElementoNodo(identificador) {
    const grupoNodo = document.createElementNS(espacioNombresSvg, 'g');
    grupoNodo.dataset.id = identificador;
    grupoNodo.innerHTML = `
      <title></title>
      <rect class="nodo-caja" width="${anchoNodo}" height="${altoNodo}" rx="10"/>
      <rect class="nodo-franja" x="10" y="14" width="3.5" height="${altoNodo - 28}" rx="2"/>
      <text class="nodo-titulo" x="22" y="25"></text>
      <text class="nodo-detalle" x="22" y="42"></text>`;
    return grupoNodo;}

  function ajustarVistaSvg(listaNodos, posiciones) {
    if (nodoArrastrado) return;
    if (!listaNodos.length || window.innerWidth > 960) {
      elementoSvg.setAttribute('viewBox', `0 0 ${anchoLienzo} ${altoLienzo}`);
      return;}
    const coordenadasX = listaNodos.map(nodo => posiciones[nodo.id][0]);
    const coordenadasY = listaNodos.map(nodo => posiciones[nodo.id][1]);
    const margen = 28;
    const minX = Math.min(...coordenadasX) - anchoNodo / 2 - margen;
    const maxX = Math.max(...coordenadasX) + anchoNodo / 2 + margen;
    const minY = Math.min(...coordenadasY) - altoNodo / 2 - margen;
    const maxY = Math.max(...coordenadasY) + altoNodo / 2 + margen;
    const anchoCaja = Math.max(420, maxX - minX);
    const altoCaja = Math.max(340, maxY - minY);
    const centroX = (minX + maxX) / 2;
    const centroY = (minY + maxY) / 2;
    elementoSvg.setAttribute(
      'viewBox',
      `${Math.round(centroX - anchoCaja / 2)} ${Math.round(centroY - altoCaja / 2)} ${Math.round(anchoCaja)} ${Math.round(altoCaja)}`);}

  function dibujar() {
    const { red, seleccionado, consulta, evidencia } = obtener();
    const listaNodos = red.nodos;

    listaNodos.forEach((nodo, posicionNodo) => {
      const coordenadas = red.posiciones[nodo.id];
      if (!Array.isArray(coordenadas) || coordenadas.length < 2) {
        const angulo = (posicionNodo * 2 * Math.PI) / listaNodos.length;
        red.posiciones[nodo.id] = [
          Math.round(400 + 250 * Math.cos(angulo)),
          Math.round(240 + 150 * Math.sin(angulo))];}});

    ajustarVistaSvg(listaNodos, red.posiciones);

    const totalArcos = listaNodos.reduce((acumulado, nodo) => acumulado + nodo.padres.length, 0);
    resumenGrafo.textContent = listaNodos.length
      ? `${listaNodos.length} nodos · ${totalArcos} ${totalArcos === 1 ? 'arco' : 'arcos'}`
      : '';
    mensajeVacio.hidden = listaNodos.length > 0;
    elementoSvg.style.visibility = listaNodos.length ? 'visible' : 'hidden';
    const hayPapelesAsignados = consulta.length > 0 || Object.keys(evidencia).length > 0;
    leyenda.hidden = !hayPapelesAsignados;

    const conjuntoConsulta = new Set(consulta);

    capaAristas.innerHTML = listaNodos
      .flatMap(nodo =>
        nodo.padres
          .filter(nombrePadre => red.posiciones[nombrePadre])
          .map(nombrePadre => {
            const posicionHijo = red.posiciones[nodo.id];
            const posicionPadre = red.posiciones[nombrePadre];
            const [inicioX, inicioY] = puntoEnBorde(posicionPadre, posicionHijo);
            const [finX, finY] = puntoEnBorde(posicionHijo, posicionPadre);
            const esRelacionada = seleccionado === nodo.id || seleccionado === nombrePadre;
            return `
              <g class="grupo-arista">
                <line class="arista ${esRelacionada ? 'relacionada' : ''}" x1="${inicioX}" y1="${inicioY}" x2="${finX}" y2="${finY}" marker-end="url(#${esRelacionada ? 'punta-activa' : 'punta'})"/>
                ${esRelacionada ? `<line class="arista-flujo" x1="${inicioX}" y1="${inicioY}" x2="${finX}" y2="${finY}"/>` : ''}
              </g>`;}))
      .join('');

    const identificadoresActuales = new Set(listaNodos.map(nodo => nodo.id));
    [...capaNodos.querySelectorAll('[data-id]')].forEach(elemento => {
      if (!identificadoresActuales.has(elemento.dataset.id)) elemento.remove();});

    listaNodos.forEach(nodo => {
      const [centroX, centroY] = red.posiciones[nodo.id];
      const esConsulta = conjuntoConsulta.has(nodo.id);
      const esEvidencia = nodo.id in evidencia;
      const clasesNodo = ['nodo'];
      if (nodo.id === seleccionado) clasesNodo.push('seleccionado');
      if (esConsulta) clasesNodo.push('consulta');
      if (esEvidencia) clasesNodo.push('evidencia');

      const textoDetalle = esConsulta
        ? 'Consulta'
        : esEvidencia
        ? `= ${evidencia[nodo.id]}`
        : nodo.estados.join(' / ');

      let grupoNodo = capaNodos.querySelector(`[data-id="${CSS.escape(nodo.id)}"]`);
      if (!grupoNodo) {
        grupoNodo = crearElementoNodo(nodo.id);
        capaNodos.appendChild(grupoNodo);}

      grupoNodo.setAttribute('class', clasesNodo.join(' '));
      grupoNodo.setAttribute('transform', `translate(${centroX - anchoNodo / 2}, ${centroY - altoNodo / 2})`);
      grupoNodo.querySelector('title').textContent = `${nodo.id}: ${nodo.estados.join(', ')}`;
      grupoNodo.querySelector('.nodo-titulo').textContent = recortarTexto(nodo.id, 16);
      grupoNodo.querySelector('.nodo-detalle').textContent = recortarTexto(textoDetalle, 20);});}

  function animarPosiciones(calcularDestino) {
    const { red } = obtener();
    if (!red.nodos.length) return;
    if (identificadorAnimacion) cancelAnimationFrame(identificadorAnimacion);

    const posicionesIniciales = {};
    red.nodos.forEach(nodo => {
      posicionesIniciales[nodo.id] = [...(red.posiciones[nodo.id] || [400, 240])];});

    calcularDestino();

    const posicionesFinales = {};
    red.nodos.forEach(nodo => {
      posicionesFinales[nodo.id] = [...(red.posiciones[nodo.id] || [400, 240])];});

    const duracionTotal = 260;
    const tiempoInicial = performance.now();

    function actualizarFotograma(tiempoActual) {
      const progreso = Math.min(1, (tiempoActual - tiempoInicial) / duracionTotal);
      const suavizado = 1 - Math.pow(1 - progreso, 3);

      red.nodos.forEach(nodo => {
        const [origenX, origenY] = posicionesIniciales[nodo.id];
        const [destinoX, destinoY] = posicionesFinales[nodo.id];
        red.posiciones[nodo.id] = [
          origenX + (destinoX - origenX) * suavizado,
          origenY + (destinoY - origenY) * suavizado];});

      dibujar();

      if (progreso < 1) {
        identificadorAnimacion = requestAnimationFrame(actualizarFotograma);
      } else {
        red.nodos.forEach(nodo => {
          red.posiciones[nodo.id] = [
            Math.round(posicionesFinales[nodo.id][0]),
            Math.round(posicionesFinales[nodo.id][1])];});
        identificadorAnimacion = null;
        actualizar({}, 'posicion');}}

    identificadorAnimacion = requestAnimationFrame(actualizarFotograma);}

  function convertirCoordenadasSvg(evento) {
    const puntoSvg = elementoSvg.createSVGPoint();
    puntoSvg.x = evento.clientX;
    puntoSvg.y = evento.clientY;
    const puntoTransformado = puntoSvg.matrixTransform(elementoSvg.getScreenCTM().inverse());
    return [puntoTransformado.x, puntoTransformado.y];}

  elementoSvg.addEventListener('pointerdown', evento => {
    const grupoSeleccionado = evento.target.closest('[data-id]');
    if (!grupoSeleccionado) return;
    if (identificadorAnimacion) {
      cancelAnimationFrame(identificadorAnimacion);
      identificadorAnimacion = null;}
    nodoArrastrado = grupoSeleccionado.dataset.id;
    huboMovimiento = false;
    const [nodoX, nodoY] = obtener().red.posiciones[nodoArrastrado];
    const [cursorX, cursorY] = convertirCoordenadasSvg(evento);
    desfaseCursor = [cursorX - nodoX, cursorY - nodoY];
    elementoSvg.setPointerCapture(evento.pointerId);
    if (obtener().seleccionado !== nodoArrastrado) actualizar({ seleccionado: nodoArrastrado });});

  elementoSvg.addEventListener('pointermove', evento => {
    if (!nodoArrastrado) return;
    const [cursorX, cursorY] = convertirCoordenadasSvg(evento);
    const posicionX = Math.max(
      anchoNodo / 2 + 4,
      Math.min(anchoLienzo - anchoNodo / 2 - 4, cursorX - desfaseCursor[0]));
    const posicionY = Math.max(
      altoNodo / 2 + 4,
      Math.min(altoLienzo - altoNodo / 2 - 4, cursorY - desfaseCursor[1]));
    obtener().red.posiciones[nodoArrastrado] = [Math.round(posicionX), Math.round(posicionY)];
    huboMovimiento = true;
    dibujar();});

  const finalizarArrastre = () => {
    if (!nodoArrastrado) return;
    nodoArrastrado = null;
    if (huboMovimiento) {
      huboMovimiento = false;
      actualizar({}, 'posicion');}};

  elementoSvg.addEventListener('pointerup', finalizarArrastre);
  elementoSvg.addEventListener('pointercancel', finalizarArrastre);

  contenedor.querySelector('#btnAutoOrganizar').onclick = () => {
    animarPosiciones(() => autoOrganizarNodos(false));};

  contenedor.querySelector('#btnCentrar').onclick = () => {
    const { red } = obtener();
    if (!red.nodos.length) return;
    animarPosiciones(() => {
      const coordenadasHorizontales = red.nodos.map(nodo => red.posiciones[nodo.id][0]);
      const coordenadasVerticales = red.nodos.map(nodo => red.posiciones[nodo.id][1]);
      const desplazamientoX =
        anchoLienzo / 2 - (Math.min(...coordenadasHorizontales) + Math.max(...coordenadasHorizontales)) / 2;
      const desplazamientoY =
        altoLienzo / 2 - (Math.min(...coordenadasVerticales) + Math.max(...coordenadasVerticales)) / 2;
      red.nodos.forEach(nodo => {
        const posicionActual = red.posiciones[nodo.id];
        red.posiciones[nodo.id] = [
          Math.round(posicionActual[0] + desplazamientoX),
          Math.round(posicionActual[1] + desplazamientoY)];});});};

  contenedor.querySelector('#btnPrimerNodo').onclick = () => alAgregarNodo && alAgregarNodo();

  window.addEventListener('resize', () => {
    const { red } = obtener();
    ajustarVistaSvg(red.nodos, red.posiciones);});

  suscribir(origen => {
    if (origen !== 'nombre' && origen !== 'posicion') dibujar();});
  dibujar();}
