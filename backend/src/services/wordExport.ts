import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { Evaluacion } from '../models/Evaluacion.js';
import { Cliente, clienteConAntecedentesDescifrados } from '../models/Cliente.js';
import { compareEvaluations } from './evaluationComparison.js';
import { kgToLb } from './medidas.js';

function cell(text: string, bold = false) {
  return new TableCell({
    width: { size: 2500, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20 })],
      }),
    ],
  });
}

export async function generarReporteWordBuffer(evaluacionId: string): Promise<Buffer> {
  const evaluacion = await Evaluacion.findById(evaluacionId);
  if (!evaluacion) throw new Error('Evaluación no encontrada');

  const clienteDoc = await Cliente.findById(evaluacion.clienteId);
  if (!clienteDoc) throw new Error('Cliente no encontrado');
  const cliente = clienteConAntecedentesDescifrados(clienteDoc);

  const anterior = await Evaluacion.obtenerAnterior(evaluacion.clienteId, evaluacion.fecha);
  const comparison = compareEvaluations(
    anterior
      ? (anterior.toObject() as Parameters<typeof compareEvaluations>[0])
      : null,
    evaluacion.toObject() as Parameters<typeof compareEvaluations>[1]
  );

  const fecha = new Date(evaluacion.fecha).toLocaleDateString('es-DO');
  const medidasEntries: [string, { anterior: number | null; actual: number | null; cambio: number | null }][] = [
    ['Cuello', comparison.medidas.cuelloCm],
    ['Torso', comparison.medidas.toraxCm],
    ['Bíceps', comparison.medidas.bicepsCm],
    ['Cintura', comparison.medidas.cinturaCm],
    ['Glúteos', comparison.medidas.gluteosCm],
    ['Cuádriceps', comparison.medidas.cuadricepsCm],
    ['Pantorrillas', comparison.medidas.pantorrillaCm],
  ];

  const medidaRows = medidasEntries.map(
    ([label, m]) =>
      new TableRow({
        children: [
          cell(label),
          cell(m?.anterior != null ? `${m.anterior}` : '—'),
          cell(m?.actual != null ? `${m.actual}` : '—'),
          cell(m?.cambio != null ? `${m.cambio}` : '—'),
        ],
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'CANELA COACH®', bold: true, color: '0C83F4' })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Reporte Mensual de Avances', bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: `Fecha de evaluación: ${fecha}` })],
          }),
          new Paragraph({ children: [] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: 'Datos del cliente', bold: true })],
          }),
          new Paragraph({ children: [new TextRun({ text: `Nombre: ${cliente.nombre}` })] }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Edad: ${cliente.edad} · Sexo: ${cliente.sexo} · Código: ${cliente.codigoCliente}`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Score físico: ${evaluacion.scoreFisico?.valor ?? '—'}% (${evaluacion.scoreFisico?.motivo || ''})`,
              }),
            ],
          }),
          new Paragraph({ children: [] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: 'Peso', bold: true })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Anterior: ${
                  comparison.pesoKg.anterior != null
                    ? `${comparison.pesoKg.anterior} kg (${kgToLb(comparison.pesoKg.anterior)} lb)`
                    : '—'
                } → Actual: ${
                  comparison.pesoKg.actual != null
                    ? `${comparison.pesoKg.actual} kg (${kgToLb(comparison.pesoKg.actual)} lb)`
                    : '—'
                } · Cambio: ${comparison.pesoKg.cambio ?? '—'} kg`,
              }),
            ],
          }),
          new Paragraph({ children: [] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: 'Medidas corporales (cm)', bold: true })],
          }),
          new Table({
            width: { size: 10000, type: WidthType.DXA },
            rows: [
              new TableRow({
                children: [cell('Medida', true), cell('Anterior', true), cell('Actual', true), cell('Cambio', true)],
              }),
              ...medidaRows,
              new TableRow({
                children: [
                  cell('Suma', true),
                  cell(
                    comparison.sumaMedidasCm.anterior != null
                      ? String(comparison.sumaMedidasCm.anterior)
                      : '—'
                  ),
                  cell(
                    comparison.sumaMedidasCm.actual != null
                      ? String(comparison.sumaMedidasCm.actual)
                      : '—'
                  ),
                  cell(
                    comparison.sumaMedidasCm.cambio != null
                      ? String(comparison.sumaMedidasCm.cambio)
                      : '—'
                  ),
                ],
              }),
            ],
          }),
          new Paragraph({ children: [] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: 'Composición corporal', bold: true })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `% Grasa: ${comparison.porcentajeGrasaCorporal.anterior ?? '—'} → ${comparison.porcentajeGrasaCorporal.actual ?? '—'} (${comparison.porcentajeGrasaCorporal.cambio ?? '—'})`,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Masa muscular: ${comparison.masaMuscularKg.anterior ?? '—'} → ${comparison.masaMuscularKg.actual ?? '—'} kg (${comparison.masaMuscularKg.cambio ?? '—'})`,
              }),
            ],
          }),
          new Paragraph({ children: [] }),
          new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: 'Puntos a mejorar', bold: true })],
          }),
          ...(evaluacion.puntosAMejorar || []).map(
            (p) => new Paragraph({ children: [new TextRun({ text: `• ${p}` })] })
          ),
          new Paragraph({ children: [] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Disciplina | Constancia | Transformación',
                italics: true,
                color: '8AA0B8',
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
