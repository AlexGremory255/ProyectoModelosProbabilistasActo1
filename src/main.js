import { actualizar, obtener, suscribir, nuevaRed } from './estado.js';
import { guardarArchivo, abrirArchivo, cargarEjemplo } from './io.js';
import { iniciar as iniciarEditor, enfocarNuevoNodo } from './ui/editor.js';
import { iniciar as iniciarGrafo } from './ui/grafo.js';
import { iniciar as iniciarConsulta } from './ui/consulta.js';
import { iniciar as iniciarImpresion } from './ui/impresion.js';
import { confirmar, avisar } from './ui/dialogos.js';

const buscar = selector => document.querySelector(selector);

const botonIzquierdo = buscar('#alternarIzquierdo');
const botonDerecho = buscar('#alternarDerecho');
const velo = buscar('#velo');
const limiteMovil = 960;
let enModoMovil = window.innerWidth <= limiteMovil;

if (enModoMovil) {
  document.body.classList.add('izquierdo-cerrado', 'derecho-cerrado');}

function actualizarEstadoPaneles() {
  const ahoraMovil = window.innerWidth <= limiteMovil;
  if (ahoraMovil !== enModoMovil) {
    enModoMovil = ahoraMovil;
    if (ahoraMovil) {
      document.body.classList.add('izquierdo-cerrado', 'derecho-cerrado');
    } else {
      document.body.classList.remove('izquierdo-cerrado', 'derecho-cerrado');}}

  const izquierdoAbierto = !document.body.classList.contains('izquierdo-cerrado');
  const derechoAbierto = !document.body.classList.contains('derecho-cerrado');

  botonIzquierdo.classList.toggle('activo', izquierdoAbierto);
  botonIzquierdo.setAttribute('aria-expanded', String(izquierdoAbierto));

  botonDerecho.classList.toggle('activo', derechoAbierto);
  botonDerecho.setAttribute('aria-expanded', String(derechoAbierto));

  if (velo) {
    velo.hidden = !(ahoraMovil && (izquierdoAbierto || derechoAbierto));}}

iniciarEditor(buscar('#editor'));
iniciarGrafo(buscar('#grafo'), {
  alAgregarNodo: () => {
    if (window.innerWidth <= limiteMovil) {
      document.body.classList.add('derecho-cerrado');}
    if (document.body.classList.contains('izquierdo-cerrado')) {
      document.body.classList.remove('izquierdo-cerrado');
      actualizarEstadoPaneles();}
    enfocarNuevoNodo();}});
iniciarConsulta(buscar('#consulta'));
iniciarImpresion(buscar('#salidaImpresion'));

botonIzquierdo.onclick = () => {
  const abrirIzquierdo = document.body.classList.contains('izquierdo-cerrado');
  if (abrirIzquierdo && window.innerWidth <= limiteMovil) {
    document.body.classList.add('derecho-cerrado');}
  document.body.classList.toggle('izquierdo-cerrado');
  actualizarEstadoPaneles();};

botonDerecho.onclick = () => {
  const abrirDerecho = document.body.classList.contains('derecho-cerrado');
  if (abrirDerecho && window.innerWidth <= limiteMovil) {
    document.body.classList.add('izquierdo-cerrado');}
  document.body.classList.toggle('derecho-cerrado');
  actualizarEstadoPaneles();};

if (velo) {
  velo.onclick = () => {
    document.body.classList.add('izquierdo-cerrado');
    document.body.classList.add('derecho-cerrado');
    actualizarEstadoPaneles();};}

actualizarEstadoPaneles();
window.addEventListener('resize', actualizarEstadoPaneles);

buscar('#botonNueva').onclick = async () => {
  const { red } = obtener();
  if (red.nodos.length > 0) {
    const confirmado = await confirmar({
      etiqueta: 'Nueva red',
      titulo: '¿Crear una nueva red bayesiana?',
      mensaje: 'Se limpiará el grafo actual para comenzar un modelo desde cero.',
      aceptar: 'Crear nueva red',
      cancelar: 'Cancelar',
      peligro: false});
    if (!confirmado) return;}

  nuevaRed('Red nueva');
  avisar('Nueva red creada. Agrega el primer nodo en el panel izquierdo.', 'exito');

  if (window.innerWidth <= limiteMovil) {
    document.body.classList.add('derecho-cerrado');}
  if (document.body.classList.contains('izquierdo-cerrado')) {
    document.body.classList.remove('izquierdo-cerrado');}
  actualizarEstadoPaneles();
  enfocarNuevoNodo();};

buscar('#botonGuardar').onclick = () => guardarArchivo(obtener().red);

buscar('#archivoRed').onchange = evento => {
  if (evento.target.files[0]) {
    abrirArchivo(evento.target.files[0]);
    if (window.innerWidth <= limiteMovil) {
      document.body.classList.add('izquierdo-cerrado', 'derecho-cerrado');
      actualizarEstadoPaneles();}}
  evento.target.value = '';};

buscar('#selectorEjemplo').onchange = evento => {
  if (evento.target.value) {
    cargarEjemplo(evento.target.value);
    if (window.innerWidth <= limiteMovil) {
      document.body.classList.add('izquierdo-cerrado', 'derecho-cerrado');
      actualizarEstadoPaneles();}}
  evento.target.value = '';};

buscar('#botonImprimir').onclick = () => window.print();

const nombreRedBarra = buscar('#nombreRedBarra');
suscribir(() => {
  const { red } = obtener();
  if (nombreRedBarra) nombreRedBarra.textContent = red.nombre || 'Red nueva';});

actualizar();
requestAnimationFrame(() => document.body.classList.add('listo'));
