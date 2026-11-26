/* DECUPA - exportacao de decupagem em PDF A4 horizontal.
 * Diagramação nativa com jsPDF: nao transforma uma pagina HTML longa em imagem.
 */
(function () {
  'use strict';
  const C = {
    navy: [61, 46, 37], ink: [59, 48, 40], muted: [130, 111, 95],
    accent: [160, 108, 73], bg: [247, 242, 234], white: [255, 253, 248],
    border: [225, 211, 195], pale: [241, 231, 217], stripe: [247, 241, 232]
  };
  const PAGE_W = 297, PAGE_H = 210, LEFT = 10, WIDTH = 277;
  const TOP = 31, BOTTOM = 198, GAP = 4;
  const IMG_X_OFFSET = 4.5, IMG_COL_W = 105, INFO_X_OFFSET = 114, INFO_W = 158;
  const get = v => String(v == null ? '' : v);
  const clean = v => get(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  const color = (doc, values, kind = 'text') => {
    if (kind === 'fill') doc.setFillColor(...values);
    else if (kind === 'draw') doc.setDrawColor(...values);
    else doc.setTextColor(...values);
  };
  const dateBR = value => {
    if (!value) return 'A definir';
    const pieces = String(value).split('-');
    return pieces.length === 3 ? (pieces[2] + '/' + pieces[1] + '/' + pieces[0]) : value;
  };
  function getLines(doc, text, width, size = 8.4) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size);
    const v = get(text).replace(/\r\n?/g, '\n').trim();
    return v ? doc.splitTextToSize(v, width).flatMap(x => String(x).split('\n')) : [];
  }
  function fitted(doc, text, x, y, maxWidth, size = 11, min = 8) {
    let s = clean(text) || 'Sem título';
    doc.setFont('helvetica', 'bold');
    while (size > min) {
      doc.setFontSize(size);
      if (doc.getTextWidth(s) <= maxWidth) break;
      size -= 0.35;
    }
    doc.setFontSize(size);
    while (doc.getTextWidth(s) > maxWidth && s.length > 5) s = s.slice(0, -2).trim() + '…';
    doc.text(s, x, y);
  }
  function pageBase(doc, project, section, first) {
    if (!first) doc.addPage('a4', 'landscape');
    color(doc, C.bg, 'fill'); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
    color(doc, C.navy, 'fill'); doc.rect(0, 0, PAGE_W, 23, 'F');
    color(doc, C.white);
    fitted(doc, project.title || 'PROJETO SEM TÍTULO', LEFT, 10.6, 234, 15.4, 10.1);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.3);
    doc.text(section, 286, 8.2, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2);
    doc.text('DECUPAGEM VISUAL  |  ' + (project.scenes?.length || 0) + ' CENAS', LEFT, 17.5);
    doc.text('PLANEJAMENTO AUDIOVISUAL', 286, 17.5, { align: 'right' });
  }
  function footer(doc, project) {
    const count = doc.internal.getNumberOfPages();
    for (let i = 1; i <= count; i++) {
      doc.setPage(i);
      color(doc, C.border, 'draw'); doc.setLineWidth(.25);
      doc.line(LEFT, 201, 286, 201);
      color(doc, C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text('DECUPA  |  ' + clean(project.title || 'Projeto'), LEFT, 205.5, { maxWidth: 246 });
      doc.text(i + ' / ' + count, 286, 205.5, { align: 'right' });
    }
  }
  function sectionHeading(doc, title, y, subtitle) {
    color(doc, C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text(title, LEFT, y + 4);
    if (subtitle) {
      color(doc, C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      doc.text(subtitle, LEFT, y + 9.4, { maxWidth: WIDTH });
    }
    return y + (subtitle ? 14 : 10);
  }
  function fieldChunks(doc, scene) {
    const specs = [
      ['AÇÃO DA CENA', scene.action],
      ['ENQUADRAMENTO / MOVIMENTO', scene.framing],
      ['LOCAÇÃO INDICADA', scene.location],
      ['FIGURINO', scene.wardrobe],
      ['CENÁRIO / AMBIENTAÇÃO', scene.scenery],
      ['OBJETOS DE CENA', scene.props],
      ['ELENCO / FIGURANTES', scene.cast],
      ['MAQUIAGEM / CARACTERIZAÇÃO', scene.makeup],
      ['SOM', scene.sound],
      ['ILUMINAÇÃO', scene.lighting],
      ['OUTRAS NECESSIDADES', scene.otherNeeds],
      ['ANOTAÇÕES ANTERIORES', scene.needs],
      ['DESCRIÇÃO COMPLEMENTAR', scene.notes]
    ].filter(([, v]) => get(v).trim());
    const chunks = []; let chunk = [], height = 0;
    const MAX_H = 128, FONT = 8.15, LINE_H = 3.6, LABEL_H = 3.0, PAD = 1.8;
    for (const [label, content] of specs) {
      let lines = getLines(doc, content, INFO_W - 6, FONT), continuation = false;
      while (lines.length) {
        const space = MAX_H - height - LABEL_H - PAD;
        const capacity = Math.floor(space / LINE_H);
        if (capacity < 1) {
          if (chunk.length) chunks.push({ fields: chunk, height });
          chunk = []; height = 0; continue;
        }
        const take = lines.splice(0, capacity);
        chunk.push({ label: continuation ? label + ' (CONT.)' : label, lines: take });
        height += LABEL_H + take.length * LINE_H + PAD;
        continuation = true;
        if (lines.length) { chunks.push({ fields: chunk, height }); chunk = []; height = 0; }
      }
    }
    if (chunk.length) chunks.push({ fields: chunk, height });
    return chunks.length ? chunks : [{ fields: [], height: 0 }];
  }
  function photoChunks(doc, photos) {
    if (!photos?.length) return [{ rows: [], height: 0 }];
    const chunks = []; let rows = [], height = 0;
    const IMG_W = (IMG_COL_W - 3) / 2;
    for (let i = 0; i < photos.length; i += 2) {
      const pair = photos.slice(i, i + 2);
      const captions = pair.map(p => getLines(doc, p.caption, IMG_W - 1, 6.7));
      const rowHeight = 26.5 + Math.max(3.5, ...captions.map(c => c.length * 2.75)) + 2.5;
      if (rows.length && (height + rowHeight + 3 > 127 || rows.length >= 3)) {
        chunks.push({ rows, height }); rows = []; height = 0;
      }
      rows.push({ photos: pair, captions, height: rowHeight });
      height += rowHeight + (rows.length > 1 ? 3 : 0);
    }
    if (rows.length) chunks.push({ rows, height });
    return chunks;
  }
  function blocksForScene(doc, scene) {
    const text = fieldChunks(doc, scene), photos = photoChunks(doc, scene.photos || []);
    const count = Math.max(text.length, photos.length);
    return Array.from({ length: count }, (_, idx) => {
      const f = text[idx] || { fields: [], height: 0 };
      const p = photos[idx] || { rows: [], height: 0 };
      return {
        text: f, photos: p, continuation: idx > 0,
        height: Math.max(44, 16 + Math.max(f.height, p.height, 24) + 4)
      };
    });
  }
  function drawImage(doc, src, x, y, w, h) {
    color(doc, C.pale, 'fill'); doc.roundedRect(x, y, w, h, 1, 1, 'F');
    if (!src || !/^data:image\//i.test(src)) return;
    try {
      const prop = doc.getImageProperties(src);
      const ratio = Math.min(w / prop.width, h / prop.height);
      const dw = prop.width * ratio, dh = prop.height * ratio;
      doc.addImage(src, undefined, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, undefined, 'FAST');
    } catch (error) {
      color(doc, C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(6);
      doc.text('Imagem indisponível', x + 2, y + h / 2);
    }
  }
  function drawScene(doc, scene, index, block, y) {
    const x = LEFT, h = block.height;
    color(doc, C.white, 'fill'); color(doc, C.border, 'draw');
    doc.setLineWidth(.28); doc.roundedRect(x, y, WIDTH, h, 2.5, 2.5, 'FD');
    color(doc, C.pale, 'fill'); doc.roundedRect(x + 3.5, y + 3.1, 16.4, 8.2, 1.8, 1.8, 'F');
    color(doc, C.navy); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.4);
    doc.text(String(index + 1).padStart(2, '0'), x + 7.6, y + 8.9);
    const suffix = block.continuation ? ' (CONTINUAÇÃO)' : '';
    color(doc, C.ink);
    fitted(doc, (scene.title || 'CENA ' + String(index + 1).padStart(2,'0')) + suffix, x + 23, y + 7.8, 230, 10.2, 8);
    color(doc, C.muted); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5);
    const loc = clean(scene.location) || 'Locação a definir';
    fitted(doc, 'LOCAÇÃO  ·  ' + loc, x + 23, y + 11.4, 220, 6.7, 6.2);
    const bodyY = y + 15.5;
    const imageX = x + IMG_X_OFFSET, imageW = (IMG_COL_W - 3) / 2;
    if (block.photos.rows.length) {
      let rowY = bodyY;
      for (const row of block.photos.rows) {
        row.photos.forEach((p, j) => {
          const ix = imageX + j * (imageW + 3);
          drawImage(doc, p.data, ix, rowY, imageW, 26.5);
          const captionLines = row.captions[j];
          color(doc, C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
          if (captionLines.length) doc.text(captionLines, ix, rowY + 29.4);
          else doc.text('REFERÊNCIA ' + (j + 1), ix, rowY + 29.4);
        });
        rowY += row.height + 3;
      }
    } else if (!block.continuation || !(scene.photos || []).length) {
      color(doc, C.pale, 'fill'); doc.roundedRect(imageX, bodyY, IMG_COL_W, 23, 1.5, 1.5, 'F');
      color(doc, C.muted); doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
      doc.text('Sem referência fotográfica', imageX + 5, bodyY + 12.8);
    }
    let textY = bodyY + 1;
    const textX = x + INFO_X_OFFSET;
    for (const part of block.text.fields) {
      color(doc, C.accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6);
      doc.text(part.label, textX, textY + 1.4);
      textY += 3;
      color(doc, C.ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.15);
      doc.text(part.lines, textX, textY + 1.5, { lineHeightFactor: 1.25 });
      textY += part.lines.length * 3.6 + 1.8;
    }
  }
  function drawODTableHeader(doc, y, widths) {
    const labels = ['INÍCIO', 'FIM', 'CENAS', 'ATIVIDADE', 'LOCAÇÃO', 'PARTICIPANTES'];
    color(doc, C.navy, 'fill'); doc.roundedRect(LEFT, y, WIDTH, 10, 1.8, 1.8, 'F');
    let x = LEFT;
    for (let i = 0; i < widths.length; i++) {
      color(doc, C.white); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.3);
      doc.text(labels[i], x + 3, y + 6.5);
      x += widths[i];
    }
    return y + 10;
  }
  function drawODRow(doc, y, cells, widths, rowNo, h) {
    color(doc, rowNo % 2 ? C.stripe : C.white, 'fill'); doc.rect(LEFT, y, WIDTH, h, 'F');
    color(doc, C.border, 'draw'); doc.setLineWidth(.2); doc.line(LEFT, y + h, 287, y + h);
    let x = LEFT;
    cells.forEach((lines, i) => {
      color(doc, C.ink); doc.setFont('helvetica', i === 3 ? 'bold' : 'normal'); doc.setFontSize(8.1);
      if (lines.length) doc.text(lines, x + 3, y + 5.5, { lineHeightFactor: 1.22 });
      x += widths[i];
    });
  }
  function renderDays(doc, project, newPage) {
    const widths = [27, 27, 27, 80, 65, 51];
    const keys = ['start', 'end', 'scenes', 'activity', 'location', 'people'];
    const lineHeight = 3.55;
    (project.days || []).forEach((day, index) => {
      let y = newPage('ORDEM DO DIA');
      y = sectionHeading(doc, 'ORDEM DO DIA  |  ' + String(index + 1).padStart(2,'0'), y,
        clean(day.title) || 'Planejamento de gravação');
      color(doc, C.white, 'fill'); color(doc, C.border, 'draw');
      doc.roundedRect(LEFT, y, WIDTH, 15, 2, 2, 'FD');
      color(doc, C.accent); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
      doc.text('DATA', LEFT + 5, y + 5.2); doc.text('LOCAÇÃO / ENDEREÇO', LEFT + 69, y + 5.2);
      color(doc, C.ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      doc.text(dateBR(day.date), LEFT + 5, y + 11.2);
      fitted(doc, clean(day.location) || 'A definir', LEFT + 69, y + 11.2, 203, 8.5, 7.5);
      y += 19;
      y = drawODTableHeader(doc, y, widths);
      const rows = day.rows?.length ? day.rows : [{start:'',end:'',scenes:'',activity:'Sem horários cadastrados',location:'',people:''}];
      rows.forEach((row, ri) => {
        const cols = keys.map((k, idx) => getLines(doc, row[k], widths[idx] - 6, 8.1));
        let offsets = cols.map(() => 0);
        do {
          if (y > BOTTOM - 12) {
            y = newPage('ORDEM DO DIA');
            y = sectionHeading(doc, 'ORDEM DO DIA  |  ' + String(index + 1).padStart(2,'0') + '  (CONT.)', y,
              clean(day.title) || 'Planejamento de gravação');
            y = drawODTableHeader(doc, y, widths);
          }
          const possibleLines = Math.max(1, Math.floor((BOTTOM - y - 6.2) / lineHeight));
          const slices = cols.map((lines, ci) => lines.slice(offsets[ci], offsets[ci] + possibleLines));
          const amount = Math.max(1, ...slices.map(arr => arr.length));
          const height = Math.max(10.5, 6.2 + amount * lineHeight);
          if (y + height > BOTTOM + .1) {
            y = newPage('ORDEM DO DIA');
            y = sectionHeading(doc, 'ORDEM DO DIA  |  ' + String(index + 1).padStart(2,'0') + '  (CONT.)', y,
              clean(day.title) || 'Planejamento de gravação');
            y = drawODTableHeader(doc, y, widths);
            continue;
          }
          drawODRow(doc, y, slices, widths, ri, height);
          y += height;
          offsets = offsets.map((n, ci) => n + slices[ci].length);
        } while (cols.some((arr, ci) => offsets[ci] < arr.length));
      });
    });
  }
  function generate(project, safeName) {
    if (!window.jspdf?.jsPDF) throw new Error('Gerador de PDF não carregou. Atualize a página e tente novamente.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    let first = true;
    function newPage(section) {
      pageBase(doc, project, section, first); first = false;
      return TOP;
    }
    let y = newPage('DECUPAGEM');
    y = sectionHeading(doc, 'DECUPAGEM VISUAL', y,
      (project.production ? clean(project.production) + '  |  ' : '') +
      (project.director ? 'Direção: ' + clean(project.director) + '  |  ' : '') +
      (project.location ? clean(project.location) : 'Cenas em ordem de roteiro'));
    if (!(project.scenes || []).length) {
      color(doc, C.ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text('Nenhuma cena cadastrada neste projeto.', LEFT, y + 7);
    }
    (project.scenes || []).forEach((scene, index) => {
      const blocks = blocksForScene(doc, scene);
      for (const block of blocks) {
        if (y + block.height > BOTTOM) y = newPage('DECUPAGEM');
        drawScene(doc, scene, index, block, y);
        y += block.height + GAP;
      }
    });
    if ((project.days || []).length) renderDays(doc, project, newPage);
    footer(doc, project);
    doc.save('Decupagem_' + safeName(project.title) + '.pdf');
  }
  window.DecupaPdf = { create: generate };
})();
