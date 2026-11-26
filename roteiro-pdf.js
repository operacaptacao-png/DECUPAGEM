/* CenaCurta — exportação de roteiro com paginação cinematográfica.
   Mantém cabeçalhos, personagens e diálogos unidos e continua tabelas entre páginas. */
(function(){
'use strict';
function gerarRoteiroPDF(){
 const ed=document.getElementById('editor'), title=(document.getElementById('input-titulo')?.value||'Roteiro').trim()||'Roteiro';
 const PDF=window.jspdf?.jsPDF;
 if(!PDF){alert('Gerador PDF indisponível. Atualize a página e tente novamente.');return;}
 try{
  if(typeof salvarNoBanco==='function')salvarNoBanco();
  const doc=new PDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
  const TOP=25,BOTTOM=271,MARGIN=25,LINE=5.1,ink=[42,34,29],brown=[121,85,61];
  let y=TOP, page=1;
  function next(){doc.addPage();page++;y=TOP;}
  function style(bold=false,size=11){doc.setFont('courier',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...ink);}
  function norm(str){return String(str||'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').replace(/\r?\n[ \t]*/g,'\n').trim();}
  function kindFor(el){
   const c=el.classList;
   if(c.contains('scene')||c.contains('rt-scene')||c.contains('header'))return 'scene';
   if(c.contains('personagem')||c.contains('rt-character'))return 'character';
   if(c.contains('dialogo')||c.contains('rt-dialogue'))return 'dialogue';
   if(c.contains('parenteses')||c.contains('rt-paren'))return 'paren';
   if(c.contains('transicao')||c.contains('rt-transition'))return 'transition';
   if(c.contains('rt-section'))return 'section';
   return 'action';
  }
  const blocks=[...ed.children].map(el=>({el,kind:el.tagName==='TABLE'?'table':kindFor(el),text:norm(el.innerText||el.textContent)}));
  function config(kind){
   switch(kind){
    case 'scene':return {x:25,w:160,gap:7,bold:true,align:'left'};
    case 'section':return {x:25,w:160,gap:7,bold:true,align:'left'};
    case 'character':return {x:65,w:80,gap:6,bold:true,align:'center'};
    case 'dialogue':return {x:55,w:100,gap:1,bold:false,align:'left'};
    case 'paren':return {x:65,w:80,gap:1,bold:false,align:'center'};
    case 'transition':return {x:105,w:80,gap:7,bold:true,align:'right'};
    default:return {x:25,w:160,gap:2,bold:false,align:'left'};
   }
  }
  function getLines(text,kind){
   const c=config(kind);style(c.bold);
   const lines=norm(text).split('\n').flatMap(line=>doc.splitTextToSize(line||' ',c.w));
   return lines.length?lines:[''];
  }
  function prepare(i){
   const b=blocks[i],c=config(b.kind);
   let txt=b.text;
   if(['scene','character','transition','section'].includes(b.kind))txt=txt.toUpperCase();
   const lines=getLines(txt,b.kind);
   return {c,lines};
  }
  function minNextHeight(i,kind){
   let j=i+1;while(j<blocks.length&&!blocks[j].text&&blocks[j].kind!=='table')j++;
   if(j>=blocks.length)return 0;
   if(kind==='character' && blocks[j].kind==='paren'){
    return 12+Math.min(2,prepare(j).lines.length)*LINE+(blocks[j+1]?Math.min(2,prepare(j+1).lines.length)*LINE:0);
   }
   return 5+Math.min(2,prepare(j).lines.length)*LINE;
  }
  function paragraph(i){
   const b=blocks[i],kind=b.kind,{c,lines}=prepare(i);
   if(!b.text){if(y+4>BOTTOM)next();y+=4;return;}
   const minLine=Math.min(lines.length,kind==='scene'||kind==='character'||kind==='section'?2:1);
   const keep=['scene','character','section'].includes(kind)?minNextHeight(i,kind):0;
   if(y+c.gap+minLine*LINE+keep+2>BOTTOM)next();
   if(y+c.gap+Math.min(lines.length,2)*LINE>BOTTOM)next();
   y+=c.gap;style(c.bold);
   for(let k=0;k<lines.length;k++){
    const remaining=lines.length-k,avail=Math.floor((BOTTOM-y)/LINE);
    if(avail<1 || (remaining>1&&avail===1&&y>TOP+20)){next();style(c.bold);}
    const px=c.align==='center'?c.x+c.w/2:c.align==='right'?c.x+c.w:c.x;
    doc.text(lines[k],px,y,{align:c.align});
    y+=LINE;
   }
   y+=1.5;
  }
  function table(el){
   const trs=[...el.querySelectorAll('tr')];if(!trs.length)return;
   const first=trs[0],header=first.querySelector('th')?first:null;
   const head=header?[...header.children].slice(0,2).map(c=>norm(c.innerText||c.textContent)):[ 'VÍDEO / IMAGEM','ÁUDIO / SOM' ];
   function tableHeader(){
    if(y+17>BOTTOM)next();
    doc.setFillColor(244,234,225);doc.setDrawColor(208,193,180);
    doc.rect(25,y,160,10,'FD');doc.line(105,y,105,y+10);
    style(true,9);
    doc.text(doc.splitTextToSize(head[0]||'IMAGEM',72).slice(0,2),29,y+4.2);
    doc.text(doc.splitTextToSize(head[1]||'ÁUDIO',72).slice(0,2),109,y+4.2);
    y+=10;style(false,9);
   }
   if(y>TOP+10) y+=3;
   tableHeader();
   const rows=header?trs.slice(1):trs;
   rows.forEach((tr,r)=>{
    const cells=[...tr.querySelectorAll('td,th')].slice(0,2);
    style(false,9);
    const a=doc.splitTextToSize(norm(cells[0]?.innerText||cells[0]?.textContent)||' ',72);
    const b=doc.splitTextToSize(norm(cells[1]?.innerText||cells[1]?.textContent)||' ',72);
    const size=Math.max(a.length,b.length,1);let off=0;
    while(off<size){
     let room=Math.floor((BOTTOM-y-7)/4.45);
     if(room<2){next();tableHeader();room=Math.floor((BOTTOM-y-7)/4.45);}
     const remaining=size-off;
     if(remaining*4.45+8>BOTTOM-y&&remaining<=Math.floor((BOTTOM-TOP-20)/4.45)&&off===0&&y>TOP+30){
      next();tableHeader();room=Math.floor((BOTTOM-y-7)/4.45);
     }
     const take=Math.max(1,Math.min(remaining,room));
     const h=take*4.45+7;
     doc.setDrawColor(224,211,200);
     if(r%2===1){doc.setFillColor(252,249,246);doc.rect(25,y,160,h,'FD');}else doc.rect(25,y,160,h);
     doc.line(105,y,105,y+h);
     style(false,9);
     const la=a.slice(off,off+take),lb=b.slice(off,off+take);
     doc.text(la,29,y+4.5,{lineHeightFactor:1.19});
     doc.text(lb,109,y+4.5,{lineHeightFactor:1.19});
     y+=h;off+=take;
     if(off<size){next();tableHeader();}
    }
   });
   y+=4;
  }
  blocks.forEach((b,i)=>b.kind==='table'?table(b.el):paragraph(i));
  const total=doc.getNumberOfPages();
  for(let p=1;p<=total;p++){
   doc.setPage(p);
   doc.setDrawColor(219,206,195);doc.line(25,280,185,280);
   doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(...brown);
   const t=title.length>65?title.slice(0,62)+'...':title;
   doc.text(t,25,286);doc.text('CenaCurta  •  '+p+' / '+total,185,286,{align:'right'});
  }
  const name=title.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,70)||'Roteiro';
  doc.save(name+'.pdf');
 }catch(err){console.error('PDF do roteiro:',err);alert('Não foi possível gerar o PDF: '+err.message);}
}
window.renderizarBaixar=gerarRoteiroPDF;
})();
