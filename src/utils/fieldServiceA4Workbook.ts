import { strToU8, zipSync } from 'fflate';

export interface FieldServiceA4Row {
  tag: string;
  equipamento: string;
  localizacao: string;
  area: string;
  range: string;
  operacao: string;
  unidadeMedida: string;
  certificate: string;
  tipoServico: string;
  ordemServico: string;
  observacao: string;
  unidade: string;
}

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

const cleanXmlText = (value: unknown): string => String(value ?? '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const escapeXml = (value: unknown): string => cleanXmlText(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const cell = (ref: string, value: unknown, style: number): string => (
  `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
);

const A4_COLUMNS = [
  { header: 'TAG', key: 'tag', width: 13 },
  { header: 'EQUIPAMENTO', key: 'equipamento', width: 20 },
  { header: 'LOCALIZAÇÃO', key: 'localizacao', width: 15 },
  { header: 'ÁREA', key: 'area', width: 9 },
  { header: 'RANGE', key: 'range', width: 12 },
  { header: 'OPERAÇÃO', key: 'operacao', width: 11 },
  { header: 'UM', key: 'unidadeMedida', width: 7 },
  { header: 'CERTIFICADO', key: 'certificate', width: 12 },
  { header: 'CERT. NOV', key: 'certNovo', width: 11 },
  { header: 'DATA MANUT', key: 'dataManut', width: 11 },
  { header: 'TIPO SERV', key: 'tipoServico', width: 11 },
  { header: 'OM', key: 'ordemServico', width: 10 },
  { header: 'OBSERVAÇÃO', key: 'observacao', width: 20 },
  { header: 'UNIDADE', key: 'unidade', width: 11 },
] as const;

const colLetters = A4_COLUMNS.map((_, index) => String.fromCharCode(65 + index));

const contentTypesXml = `${XML_HEADER}
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const packageRelsXml = `${XML_HEADER}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const workbookRelsXml = `${XML_HEADER}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const stylesXml = `${XML_HEADER}
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="0"/>
  <fonts count="4">
    <font><sz val="10"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="15"/><color rgb="FF17365D"/><name val="Arial"/><family val="2"/></font>
    <font><b/><sz val="7"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>
    <font><sz val="7"/><color rgb="FF111827"/><name val="Arial"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF17365D"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF9CA3AF"/></left>
      <right style="thin"><color rgb="FF9CA3AF"/></right>
      <top style="thin"><color rgb="FF9CA3AF"/></top>
      <bottom style="thin"><color rgb="FF9CA3AF"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;

const drawingXml = `${XML_HEADER}
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
          xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:oneCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>90000</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>90000</xdr:rowOff></xdr:from>
    <xdr:ext cx="1428750" cy="481013"/>
    <xdr:pic>
      <xdr:nvPicPr><xdr:cNvPr id="2" name="Logo COMANINS"/><xdr:cNvPicPr/></xdr:nvPicPr>
      <xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
      <xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1428750" cy="481013"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></xdr:spPr>
    </xdr:pic>
    <xdr:clientData/>
  </xdr:oneCellAnchor>
</xdr:wsDr>`;

const drawingRelsXml = `${XML_HEADER}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`;

const sheetRelsXml = `${XML_HEADER}
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;

export const buildFieldServiceA4Workbook = (
  rows: FieldServiceA4Row[],
  logoPng: Uint8Array,
): Uint8Array => {
  if (rows.length === 0) throw new Error('Nenhum registro encontrado para o filtro atual.');
  if (!logoPng?.length) throw new Error('A logo COMANINS não pôde ser carregada.');

  const lastRow = Math.max(5, rows.length + 4);
  const columnsXml = A4_COLUMNS.map((column, index) => {
    const col = index + 1;
    return `<col min="${col}" max="${col}" width="${column.width}" customWidth="1"/>`;
  }).join('');

  const titleRowsXml = [
    `<row r="1" ht="18" customHeight="1">${cell('D1', 'LISTA DE SERVIÇOS', 1)}</row>`,
    '<row r="2" ht="18" customHeight="1"></row>',
    '<row r="3" ht="18" customHeight="1"></row>',
  ].join('');

  const headerCells = A4_COLUMNS.map((column, index) => cell(`${colLetters[index]}4`, column.header, 2)).join('');
  const headerRowXml = `<row r="4" ht="26" customHeight="1">${headerCells}</row>`;

  const dataRowsXml = rows.map((row, rowIndex) => {
    const excelRow = rowIndex + 5;
    const values: Record<string, unknown> = {
      tag: row.tag,
      equipamento: row.equipamento,
      localizacao: row.localizacao,
      area: row.area,
      range: row.range,
      operacao: row.operacao,
      unidadeMedida: row.unidadeMedida,
      certificate: row.certificate,
      certNovo: '',
      dataManut: '',
      tipoServico: row.tipoServico,
      ordemServico: row.ordemServico,
      observacao: row.observacao,
      unidade: row.unidade,
    };
    const cells = A4_COLUMNS.map((column, index) => {
      const centered = ['area', 'range', 'operacao', 'unidadeMedida', 'certificate', 'certNovo', 'dataManut', 'tipoServico', 'ordemServico', 'unidade'].includes(column.key);
      return cell(`${colLetters[index]}${excelRow}`, values[column.key], centered ? 4 : 3);
    }).join('');
    return `<row r="${excelRow}" ht="22" customHeight="1">${cells}</row>`;
  }).join('');

  const sheetXml = `${XML_HEADER}
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:N${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${columnsXml}</cols>
  <sheetData>${titleRowsXml}${headerRowXml}${dataRowsXml}</sheetData>
  <autoFilter ref="A4:N${lastRow}"/>
  <mergeCells count="1"><mergeCell ref="D1:N3"/></mergeCells>
  <printOptions horizontalCentered="0" verticalCentered="0"/>
  <pageMargins left="0.15" right="0.15" top="0.20" bottom="0.20" header="0.10" footer="0.10"/>
  <pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0" horizontalDpi="300" verticalDpi="300"/>
  <drawing r:id="rId1"/>
</worksheet>`;

  const workbookXml = `${XML_HEADER}
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
  <sheets><sheet name="Lista de Serviços" sheetId="1" r:id="rId1"/></sheets>
  <definedNames>
    <definedName name="_xlnm.Print_Area" localSheetId="0">'Lista de Serviços'!$A$1:$N$${lastRow}</definedName>
    <definedName name="_xlnm.Print_Titles" localSheetId="0">'Lista de Serviços'!$4:$4</definedName>
  </definedNames>
  <calcPr calcId="191029"/>
</workbook>`;

  const now = new Date().toISOString();
  const coreXml = `${XML_HEADER}
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:dcmitype="http://purl.org/dc/dcmitype/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>COMANINS</dc:creator><cp:lastModifiedBy>COMANINS</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
  <dc:title>Lista de Serviços - Serviço de Campo</dc:title>
</cp:coreProperties>`;

  const appXml = `${XML_HEADER}
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
            xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>COMANINS</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop>
  <TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Lista de Serviços</vt:lpstr></vt:vector></TitlesOfParts>
  <Company>COMANINS</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0</AppVersion>
</Properties>`;

  return zipSync({
    '[Content_Types].xml': strToU8(contentTypesXml),
    '_rels/.rels': strToU8(packageRelsXml),
    'docProps/core.xml': strToU8(coreXml),
    'docProps/app.xml': strToU8(appXml),
    'xl/workbook.xml': strToU8(workbookXml),
    'xl/_rels/workbook.xml.rels': strToU8(workbookRelsXml),
    'xl/styles.xml': strToU8(stylesXml),
    'xl/worksheets/sheet1.xml': strToU8(sheetXml),
    'xl/worksheets/_rels/sheet1.xml.rels': strToU8(sheetRelsXml),
    'xl/drawings/drawing1.xml': strToU8(drawingXml),
    'xl/drawings/_rels/drawing1.xml.rels': strToU8(drawingRelsXml),
    'xl/media/image1.png': logoPng,
  }, { level: 6 });
};
