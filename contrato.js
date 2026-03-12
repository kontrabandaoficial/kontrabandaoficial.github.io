


// ══════════════════════════════════════════════
//  CONFIGURACIÓN CLOUDINARY
// ══════════════════════════════════════════════
var CLOUD_NAME  = 'drwewbgta';
var UPLOAD_PRESET = 'nic1mwjn';

// ══════════════════════════════════════════════
//  ESTADO GLOBAL
// ══════════════════════════════════════════════
var firmaVacia = true;
var carnetURLs = { frontal: null, posterior: null };
var pdfBlob = null;
var canvas, ctx, dibujando = false;

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
(function init() {
  var hoy = new Date();
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var fechaStr = hoy.getDate() + ' de ' + MESES[hoy.getMonth()] + ' de ' + hoy.getFullYear();
  document.getElementById('lbl-fecha').textContent = 'FECHA: ' + fechaStr.toUpperCase();
  document.getElementById('t-fecha-firma').textContent = fechaStr;

  // Leer parámetros de la URL (modo cliente)
  var params = new URLSearchParams(window.location.search);
  if (params.has('n') || params.has('nombre')) {
    // MODO CLIENTE: ocultar panel admin, llenar datos
    document.getElementById('panel-admin').style.display = 'none';
    llenarDesdeURL(params);
  } else {
    // MODO ADMIN: mostrar panel
    document.getElementById('panel-admin').style.display = 'block';
    // ID provisional
    document.getElementById('lbl-id').textContent = 'ID: #' + hoy.getFullYear() + '-' + pad(hoy.getMonth()+1) + '-' + pad(hoy.getDate()) + '-KB-??';
  }

  // Canvas firma
  canvas = document.getElementById('firmaCanvas');
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', function(e){ dibujando=true; firmaVacia=false; var p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); });
  canvas.addEventListener('mousemove', function(e){ if(!dibujando)return; var p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); });
  canvas.addEventListener('mouseup', function(){ dibujando=false; });
  canvas.addEventListener('mouseleave', function(){ dibujando=false; });
  canvas.addEventListener('touchstart', function(e){ e.preventDefault(); e.stopPropagation(); dibujando=true; firmaVacia=false; var p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); },{passive:false});
  canvas.addEventListener('touchmove', function(e){ e.preventDefault(); e.stopPropagation(); if(!dibujando)return; var p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); },{passive:false});
  canvas.addEventListener('touchend', function(e){ e.preventDefault(); dibujando=false; },{passive:false});
})();

// ══════════════════════════════════════════════
//  MODO CLIENTE — llenar desde URL
// ══════════════════════════════════════════════
function llenarDesdeURL(p) {
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var hoy = new Date();
  // Soportar tanto claves largas (nombre,rut,...) como cortas (n,r,...)
  var nom  = (p.get('n')||p.get('nombre')||'').toUpperCase();
  var rut  = (p.get('r')||p.get('rut')||'');
  var dir  = (p.get('d')||p.get('dir')||'').toUpperCase();
  var tel  = (p.get('t')||p.get('tel')||'');
  var em   = (p.get('e')||p.get('email')||'');
  var fev  = (p.get('f')||p.get('fechaev')||'').toUpperCase();
  var lug  = (p.get('l')||p.get('lugar')||'').toUpperCase();
  var tot  = parseInt(p.get('monto')||0);
  var mit  = Math.round(tot/2);
  var ini  = nom.split(' ').filter(function(w){return w.length>0;}).map(function(w){return w[0];}).join('').substring(0,3);
  var idC  = '#' + hoy.getFullYear()+'-'+pad(hoy.getMonth()+1)+'-'+pad(hoy.getDate())+'-KB-'+ini;

  setText('t-nombre', nom||'[ Nombre ]');
  setText('t-rut',    rut||'[ RUT ]');
  setText('t-dir',    dir||'[ Dirección ]');
  setText('t-tel',    tel||'[ Teléfono ]');
  setText('t-email',  em||'[ Correo ]');
  setText('t-fecha-ev', fev||'[ Fecha del Evento ]');
  setText('t-lugar',  lug||'[ Lugar ]');
  setText('t-total',  tot>0 ? '$ '+tot.toLocaleString('es-CL') : '$ [ Total ]');
  setText('t-50',     mit>0 ? '$ '+mit.toLocaleString('es-CL') : '$ [ 50% ]');
  setText('t-rest',   (tot-mit)>0 ? '$ '+(tot-mit).toLocaleString('es-CL') : '$ [ Restante ]');
  setText('lbl-fnombre', nom||'—');
  setText('lbl-frut',  'RUT: '+rut);
  document.getElementById('lbl-id').textContent = 'ID: ' + idC;
  // Timeline desde URL
  setText('t-h1', p.get('h1')||'18:30 hrs');
  setText('t-d1', p.get('d1')||'Arribo del equipo técnico y montaje de infraestructura.');
  setText('t-h2', p.get('h2')||'19:00 hrs');
  setText('t-d2', p.get('d2')||'Inicio de prueba de sonido (Soundcheck).');
  setText('t-h3', p.get('h3')||'21:30 hrs');
  setText('t-d3', p.get('d3')||'Inicio de la presentación musical.');
}

// ══════════════════════════════════════════════
//  MODO ADMIN — sync en tiempo real
// ══════════════════════════════════════════════
function sync() {
  var hoy = new Date();
  var nom  = (v('a-nombre')||'[ Nombre ]').toUpperCase();
  var rut  = v('a-rut')||'[ RUT ]';
  var dir  = (v('a-dir')||'[ Dirección ]').toUpperCase();
  var tel  = v('a-tel')||'[ Teléfono ]';
  var em   = v('a-email')||'[ Correo ]';
  var fev  = (v('a-fecha-ev')||'[ Fecha del Evento ]').toUpperCase();
  var lug  = (v('a-lugar')||'[ Lugar ]').toUpperCase();
  var tot  = parseInt((v('a-monto')||'').replace(/\./g,'').replace(/[^\d]/g,''))||0;
  var mit  = Math.round(tot/2);
  var ini  = nom.split(' ').filter(function(w){return w.length>0;}).map(function(w){return w[0];}).join('').substring(0,3);

  setText('t-nombre', nom); setText('t-rut', rut); setText('t-dir', dir);
  setText('t-tel', tel); setText('t-email', em); setText('t-fecha-ev', fev); setText('t-lugar', lug);
  setText('t-total', tot>0?'$ '+tot.toLocaleString('es-CL'):'$ [ Total ]');
  setText('t-50',    mit>0?'$ '+mit.toLocaleString('es-CL'):'$ [ 50% ]');
  setText('t-rest',  (tot-mit)>0?'$ '+(tot-mit).toLocaleString('es-CL'):'$ [ Restante ]');
  setText('lbl-fnombre', nom); setText('lbl-frut', 'RUT: '+rut);
  var idC = '#'+hoy.getFullYear()+'-'+pad(hoy.getMonth()+1)+'-'+pad(hoy.getDate())+'-KB-'+(ini||'??');
  document.getElementById('lbl-id').textContent = 'ID: '+idC;
  // Timeline
  setText('t-h1', v('a-h1')||'18:30 hrs'); setText('t-d1', v('a-d1')||'Arribo del equipo técnico y montaje de infraestructura.');
  setText('t-h2', v('a-h2')||'19:00 hrs'); setText('t-d2', v('a-d2')||'Inicio de prueba de sonido (Soundcheck).');
  setText('t-h3', v('a-h3')||'21:30 hrs'); setText('t-d3', v('a-d3')||'Inicio de la presentación musical.');
}

function calcMonto() {
  var raw = (v('a-monto')||'').replace(/\./g,'').replace(/[^\d]/g,'');
  var tot = parseInt(raw)||0;
  var mit = Math.round(tot/2);
  document.getElementById('adm-50').textContent = tot>0 ? '$ '+mit.toLocaleString('es-CL') : '$ —';
  if(tot>0) document.getElementById('a-monto').value = tot.toLocaleString('es-CL');
}

// ══════════════════════════════════════════════
//  GENERAR LINK PARA CLIENTE
// ══════════════════════════════════════════════


function resizeCanvas(){
  var rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1;
  var img=null; try{ if(!firmaVacia) img=canvas.toDataURL(); }catch(e){}
  canvas.width=rect.width*dpr; canvas.height=rect.height*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.strokeStyle='#0D0D0D'; ctx.lineWidth=2; ctx.lineCap='round'; ctx.lineJoin='round';
  if(img){ var i=new Image(); i.onload=function(){ctx.drawImage(i,0,0,rect.width,rect.height);}; i.src=img; }
}
function pos(e){
  var r=canvas.getBoundingClientRect();
  if(e.touches&&e.touches.length>0) return{x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};
  return{x:e.clientX-r.left,y:e.clientY-r.top};
}
function borrarFirma(){ ctx.clearRect(0,0,canvas.width,canvas.height); firmaVacia=true; }

// ══════════════════════════════════════════════
//  RUT
// ══════════════════════════════════════════════
function fmtRUT(inp){
  var val=inp.value.replace(/[^0-9kK]/g,'').toUpperCase();
  if(val.length>1) inp.value=val.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,'.')+'-'+val.slice(-1);
  else inp.value=val;
}

// ══════════════════════════════════════════════
//  GENERAR PDF
// ══════════════════════════════════════════════
function generar(){
  var errores=[], valid=true;
  if(!carnetURLs.frontal){ document.getElementById('err-frontal').style.display='block'; errores.push('Cédula de identidad — lado frontal'); valid=false; }
  else document.getElementById('err-frontal').style.display='none';
  if(!carnetURLs.posterior){ document.getElementById('err-posterior').style.display='block'; errores.push('Cédula de identidad — lado posterior'); valid=false; }
  else document.getElementById('err-posterior').style.display='none';
  if(firmaVacia){ document.getElementById('err-firma').style.display='block'; errores.push('Firma digital del contratante'); valid=false; }
  else document.getElementById('err-firma').style.display='none';
  if(!document.getElementById('chk-acepta').checked){ errores.push('Aceptar los términos del contrato'); valid=false; }

  if(!valid){
    var b=document.getElementById('banner-err');
    b.innerHTML='<p>⚠ Faltan los siguientes pasos:</p><ul>'+errores.map(function(e){return '<li>'+e+'</li>';}).join('')+'</ul>';
    b.style.display='block'; b.scrollIntoView({behavior:'smooth',block:'center'}); return;
  }
  document.getElementById('banner-err').style.display='none';

  var firmaImg=null;
  try{ firmaImg=canvas.toDataURL('image/png'); if(!firmaImg||firmaImg.length<1000) firmaImg=null; }catch(e){}

  var hoy=new Date();
  var MESES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var fechaHoy=hoy.getDate()+' de '+MESES[hoy.getMonth()]+' de '+hoy.getFullYear();

  // Leer datos del contrato (ya están en el DOM)
  var params=new URLSearchParams(window.location.search);
  var nom=(params.get('nombre')||'').toUpperCase();
  var rut=params.get('rut')||'';
  var tot=parseInt(params.get('monto')||0);
  var mit=Math.round(tot/2);
  var ini=nom.split(' ').filter(function(w){return w.length>0;}).map(function(w){return w[0];}).join('').substring(0,3);

  var d={
    id:'#'+hoy.getFullYear()+'-'+pad(hoy.getMonth()+1)+'-'+pad(hoy.getDate())+'-KB-'+ini,
    fecha: fechaHoy,
    nombre: nom, rut: rut,
    dir: (params.get('dir')||'').toUpperCase(),
    tel: params.get('tel')||'',
    email: params.get('email')||'',
    fechaEv: (params.get('fechaev')||'').toUpperCase(),
    lugar: (params.get('lugar')||'').toUpperCase(),
    total: tot.toLocaleString('es-CL'),
    mitad: mit.toLocaleString('es-CL'),
    resto: (tot-mit).toLocaleString('es-CL'),
    urlFrontal: carnetURLs.frontal,
    urlPosterior: carnetURLs.posterior,
  };
  buildPDF(d, firmaImg);
}

function buildPDF(d, firmaImg){
  var jsPDF=window.jspdf.jsPDF;
  var doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  var pw=210,ph=297,mg=18,lw=pw-mg*2,y=mg;

  function chk(ex){if(y+ex>ph-mg){doc.addPage();y=mg;}}
  function sec(t){chk(10);doc.setFillColor(13,13,13);doc.rect(mg,y,lw,6,'F');doc.setTextColor(201,168,76);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.text('◆  '+t,mg+3,y+4);y+=9;}
  function ctit(n,t){chk(8);doc.setTextColor(13,13,13);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.text(n+' — '+t.toUpperCase(),mg,y);doc.setDrawColor(201,168,76);doc.setLineWidth(0.4);doc.line(mg,y+1,pw-mg,y+1);y+=5;}
  function par(txt){doc.setTextColor(42,36,32);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.splitTextToSize(txt,lw).forEach(function(l){chk(5);doc.text(l,mg,y);y+=4.5;});y+=2;}
  function itm(t,v){chk(5);doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(13,13,13);doc.text('• '+t+': ',mg+2,y);var tw=doc.getTextWidth('• '+t+': ');doc.setFont('helvetica','normal');doc.setTextColor(42,36,32);doc.splitTextToSize(v,lw-tw-4).forEach(function(l,i){if(i>0){y+=4.5;}doc.text(l,mg+2+tw,y);});y+=4.5;}

  // Header
  doc.setFillColor(245,242,237);doc.rect(0,0,pw,ph,'F');
  doc.setFillColor(13,13,13);doc.rect(0,0,pw,28,'F');
  doc.setTextColor(201,168,76);doc.setFont('helvetica','bold');doc.setFontSize(20);
  doc.text('KONTRABANDA',pw/2,12,{align:'center'});
  doc.setFontSize(7);doc.setFont('helvetica','normal');
  doc.text('SERVICIOS DE MÚSICA EN VIVO · CHILE',pw/2,18,{align:'center'});
  doc.text('kontrabandaoficialchile@gmail.com  |  Maturana 961, Valparaíso',pw/2,24,{align:'center'});
  y=34;
  doc.setTextColor(13,13,13);doc.setFont('helvetica','bold');doc.setFontSize(13);
  doc.text('CONTRATO DE PRESTACIÓN DE SERVICIOS MUSICALES',pw/2,y,{align:'center'});
  y+=5;doc.setDrawColor(201,168,76);doc.setLineWidth(0.7);doc.line(mg,y,pw-mg,y);y+=4;
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(100,96,90);
  doc.text('ID: '+d.id,mg,y);doc.text('FECHA: '+d.fecha.toUpperCase(),pw-mg,y,{align:'right'});
  y+=3;doc.setDrawColor(220,215,208);doc.setLineWidth(0.3);doc.line(mg,y,pw-mg,y);y+=6;

  sec('I. COMPARECIENTES');
  par('PRESTADOR: KONTRABANDA, representada por Don Jose Luis Figueroa, RUT 12.622.876-7, domicilio en Maturana 961, Valparaíso ("LA BANDA").');
  par('CONTRATANTE: Don/Doña '+d.nombre+', RUT '+d.rut+', domicilio en '+d.dir+', teléfono '+d.tel+', correo '+d.email+' ("EL CLIENTE").');

  sec('II. CLÁUSULAS CONTRACTUALES');
  ctit('PRIMERA','Objeto y Duración del Servicio');
  par('LA BANDA se compromete a realizar una presentación musical en vivo el día '+d.fechaEv+', en '+d.lugar+'. Duración: 90 minutos de ejecución efectiva.');
  ctit('SEGUNDA','Planificación Logística (Timeline)');
  var tl=[
    {h:getText('t-h1'),d:getText('t-d1')},
    {h:getText('t-h2'),d:getText('t-d2')},
    {h:getText('t-h3'),d:getText('t-d3')},
  ];
  tl.forEach(function(r){ if(r.h&&r.d) itm(r.h,r.d); });
  y+=2;
  ctit('TERCERA','Obligaciones Técnicas y Logísticas');
  par('LA BANDA proporcionará el sistema de sonorización y personal técnico. EL CLIENTE deberá proveer:');
  itm('Suministro Eléctrico','Conexión estable (220v) y segura a pie de escenario.');
  itm('Catering','Colación y bebestibles para los 9 integrantes.');
  itm('Área de Desempeño','Espacio nivelado y despejado para el montaje.');
  itm('Camarín','Área privada y confortable para el equipo artístico.');y+=2;
  ctit('CUARTA','Condiciones Económicas y Reserva');
  par('Valor total del servicio: $ '+d.total+' CLP. Anticipo (50%): $ '+d.mitad+' CLP a la firma. Saldo (50%): $ '+d.resto+' CLP al término de la presentación.');
  ctit('QUINTA','Datos de Transferencia y Confirmación');
  itm('Banco','Santander  |  Cta. Corriente N° 62547960');
  itm('RUT / Correo','12.622.876-7  |  kontrabandaoficialchile@gmail.com');
  par('Enviar comprobante al correo indicado o vía WhatsApp al número de administración.');
  ctit('SEXTA','Política de Cancelación y Fuerza Mayor');
  par('Cancelación EL CLIENTE (<10 días): pérdida del anticipo. Cancelación LA BANDA: devolución en 5 días hábiles. Fuerza mayor: reprogramación sin penalidad.');
  ctit('SÉPTIMA','Domicilio Legal y Jurisdicción');
  par('Las partes fijan domicilio en Valparaíso y se someten a sus Tribunales Ordinarios de Justicia.');

  // FIRMAS
  sec('III. FIRMAS DE CONFORMIDAD');
  chk(50);
  var fy=y,mid=pw/2;
  doc.setFillColor(245,242,237);doc.setDrawColor(220,215,208);doc.setLineWidth(0.4);
  doc.rect(mg,fy,lw/2-4,42,'FD');
  doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(100,96,90);
  doc.text('LA BANDA — PRESTADOR',mg+(lw/2-4)/2,fy+5,{align:'center'});
  doc.setFont('helvetica','italic');doc.setFontSize(14);doc.setTextColor(80,76,70);
  doc.text('Jose Luis Figueroa',mg+(lw/2-4)/2,fy+22,{align:'center'});
  doc.setDrawColor(13,13,13);doc.setLineWidth(0.6);doc.line(mg+8,fy+29,mg+lw/2-12,fy+29);
  doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(13,13,13);
  doc.text('JOSE LUIS FIGUEROA',mg+(lw/2-4)/2,fy+33,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(100,96,90);
  doc.text('RUT: 12.622.876-7',mg+(lw/2-4)/2,fy+37,{align:'center'});
  doc.text('KONTRABANDA',mg+(lw/2-4)/2,fy+41,{align:'center'});

  var cx=mid+2;
  doc.setFillColor(245,242,237);doc.setDrawColor(220,215,208);doc.rect(cx,fy,lw/2-4,42,'FD');
  doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(100,96,90);
  doc.text('EL CLIENTE — CONTRATANTE',cx+(lw/2-4)/2,fy+5,{align:'center'});
  if(firmaImg){try{doc.addImage(firmaImg,'PNG',cx+4,fy+7,lw/2-12,20);}catch(e){}}
  doc.setDrawColor(13,13,13);doc.setLineWidth(0.6);doc.line(cx+8,fy+29,cx+lw/2-12,fy+29);
  doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(13,13,13);
  doc.text(d.nombre,cx+(lw/2-4)/2,fy+33,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(100,96,90);
  doc.text('RUT: '+d.rut,cx+(lw/2-4)/2,fy+37,{align:'center'});
  y=fy+46;

  // CARNET EN PDF (nueva página)
  if(d.urlFrontal || d.urlPosterior){
    doc.addPage(); y=mg;
    sec('IV. DOCUMENTOS DE IDENTIDAD DEL CONTRATANTE');
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,96,90);
    doc.text('Imágenes verificadas y almacenadas al momento de la firma digital del contrato.',mg,y);y+=8;

    if(d.urlFrontal){
      doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(13,13,13);
      doc.text('Cédula de Identidad — Lado Frontal:',mg,y);y+=4;
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(100,96,90);
      doc.text(d.urlFrontal,mg,y);y+=6;
    }
    if(d.urlPosterior){
      doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(13,13,13);
      doc.text('Cédula de Identidad — Lado Posterior:',mg,y);y+=4;
      doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(100,96,90);
      doc.text(d.urlPosterior,mg,y);y+=6;
    }
    doc.setFont('helvetica','italic');doc.setFontSize(7.5);doc.setTextColor(100,96,90);
    doc.text('Firmado digitalmente el '+d.fecha+' · Valparaíso, Chile',pw/2,y+6,{align:'center'});
  }

  // Pie
  var tp=doc.getNumberOfPages();
  for(var i=1;i<=tp;i++){
    doc.setPage(i);doc.setFillColor(13,13,13);doc.rect(0,ph-10,pw,10,'F');
    doc.setTextColor(201,168,76);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('KONTRABANDA',mg,ph-4);
    doc.setFont('helvetica','normal');doc.setTextColor(120,116,110);
    doc.text(d.id+' | Valparaíso, Chile',pw/2,ph-4,{align:'center'});
    doc.text('Pág. '+i+' de '+tp,pw-mg,ph-4,{align:'right'});
  }

  var fn='Contrato_Kontrabanda_'+d.nombre.replace(/ /g,'_')+'_'+d.id.replace(/[#:]/g,'')+'.pdf';
  var blob=doc.output('blob');
  pdfBlob={blob:blob,name:fn};
  var esMovil=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if(!esMovil){
    var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.download=fn;a.click();
    setTimeout(function(){URL.revokeObjectURL(url);},3000);
  } else {
    document.getElementById('btn-movil').style.display='inline-block';
  }
  document.getElementById('msg-ok').style.display='block';
}



// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════
function getText(id) {
  var el = document.getElementById(id);
  return el ? el.textContent.trim() : '';
}
function setText(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}
function pad(n) { return n < 10 ? '0' + n : String(n); }

// ══════════════════════════════════════════════
//  COPIAR MODAL LINK
// ══════════════════════════════════════════════
function copiarModalLink() {
  var txt = document.getElementById('modal-link-texto');
  txt.select();
  txt.setSelectionRange(0, 99999);
  var ok = false;
  try { ok = document.execCommand('copy'); } catch(e){}
  if (!ok && navigator.clipboard) {
    navigator.clipboard.writeText(txt.value).catch(function(){});
  }
  var av = document.getElementById('modal-aviso');
  av.textContent = '✔ Link copiado — pegue con Ctrl+V en WhatsApp';
  av.style.display = 'block';
}

// ══════════════════════════════════════════════
//  SUBIR CARNET A CLOUDINARY
// ══════════════════════════════════════════════
function subirCarnet(input, lado) {
  var file = input.files[0];
  if (!file) return;

  var areaId  = 'area-'  + lado;
  var prevId  = 'prev-'  + lado;
  var estId   = 'est-'   + lado;
  var iconId  = 'icon-'  + lado;

  document.getElementById(estId).textContent = '⏳ Subiendo...';

  var formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);

  fetch('https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/image/upload', {
    method: 'POST',
    body: formData
  })
  .then(function(r){ return r.json(); })
  .then(function(data) {
    if (data.secure_url) {
      carnetURLs[lado] = data.secure_url;
      var prev = document.getElementById(prevId);
      prev.src = data.secure_url;
      prev.style.display = 'block';
      document.getElementById(iconId).style.display = 'none';
      document.getElementById(estId).textContent = '✔ Imagen subida correctamente';
      document.getElementById(estId).style.color = '#1A5C3A';
      document.getElementById(areaId).style.borderColor = '#1A5C3A';
    } else {
      document.getElementById(estId).textContent = '✗ Error al subir. Intente nuevamente.';
      document.getElementById(estId).style.color = 'red';
    }
  })
  .catch(function() {
    document.getElementById(estId).textContent = '✗ Error de conexión. Intente nuevamente.';
    document.getElementById(estId).style.color = 'red';
  });
}

// ══════════════════════════════════════════════
//  DESCARGAR MÓVIL
// ══════════════════════════════════════════════
function descMovil() {
  if (!pdfBlob) return;
  var url = URL.createObjectURL(pdfBlob.blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = pdfBlob.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 3000);
}

// ══════════════════════════════════════════════
//  GENERAR LINK PARA CLIENTE (MODO ADMIN)
// ══════════════════════════════════════════════
function generarLink() {
  function gv(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }
  var nombre = gv('a-nombre');
  var monto  = gv('a-monto');

  if (!nombre || !monto) {
    alert('Complete al menos Nombre y Monto para generar el link.');
    return;
  }

  var raw = monto.replace(/\./g,'').replace(/[^\d]/g,'');
  var base = 'https://kontrabandaoficial.github.io/contrato.html';

  // Usar claves cortas para acortar la URL
  var p = {
    n:  nombre,
    r:  gv('a-rut'),
    d:  gv('a-dir'),
    t:  gv('a-tel'),
    e:  gv('a-email'),
    f:  gv('a-fecha-ev'),
    l:  gv('a-lugar'),
    m:  raw,
    h1: gv('a-h1') || '18:30 hrs',
    d1: gv('a-d1') || 'Arribo del equipo técnico y montaje.',
    h2: gv('a-h2') || '19:00 hrs',
    d2: gv('a-d2') || 'Inicio de prueba de sonido (Soundcheck).',
    h3: gv('a-h3') || '21:30 hrs',
    d3: gv('a-d3') || 'Inicio de la presentación musical.'
  };

  var qs = Object.keys(p).map(function(k){
    return encodeURIComponent(k) + '=' + encodeURIComponent(p[k]);
  }).join('&');

  var link = base + '?' + qs;

  var textarea = document.getElementById('modal-link-texto');
  if (textarea) {
    textarea.value = link;
    document.getElementById('modal-aviso').style.display = 'none';
    var ml=document.getElementById('modal-link');ml.style.display='flex';ml.style.alignItems='center';ml.style.justifyContent='center';
    setTimeout(function(){
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      try { document.execCommand('copy'); } catch(ex) {}
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(link).then(function(){
          var av = document.getElementById('modal-aviso');
          av.textContent = '✔ Copiado automáticamente — pegue con Ctrl+V';
          av.style.display = 'block';
        }).catch(function(){});
      }
    }, 100);
  }
}

// ══════════════════════════════════════════════
//  MODAL LINK EVENTOS
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  var btnCopiar = document.getElementById('btn-copiar-modal');
  var btnCerrar = document.getElementById('btn-cerrar-modal');
r');
  if (btnCopiar) btnCopiar.addEventListener('click', copiarModalLink);
  if (btnCerrar) btnCerrar.addEventListener('click', function(){
    document.getElementById('modal-link').style.display = 'none';
  });
});
