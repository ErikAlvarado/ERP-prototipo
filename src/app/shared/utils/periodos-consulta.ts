export type PeriodoConsulta = 'semana' | 'mes' | 'tres-meses' | 'anio';

export const PERIODOS_CONSULTA: ReadonlyArray<{ valor: PeriodoConsulta; etiqueta: string }> = [
  { valor: 'semana', etiqueta: 'Esta semana' },
  { valor: 'mes', etiqueta: 'Este mes' },
  { valor: 'tres-meses', etiqueta: '3 meses' },
  { valor: 'anio', etiqueta: '1 año' },
];

export function inicioPeriodo(periodo: PeriodoConsulta, referencia = new Date()): Date {
  const inicio = new Date(referencia);
  inicio.setHours(0, 0, 0, 0);
  if (periodo === 'semana') {
    const dia = inicio.getDay() || 7;
    inicio.setDate(inicio.getDate() - dia + 1);
  } else if (periodo === 'mes') {
    inicio.setDate(1);
  } else if (periodo === 'tres-meses') {
    inicio.setMonth(inicio.getMonth() - 3);
  } else {
    inicio.setFullYear(inicio.getFullYear() - 1);
  }
  return inicio;
}

export function perteneceAlPeriodo(fecha: string, periodo: PeriodoConsulta): boolean {
  const valor = new Date(fecha);
  return !Number.isNaN(valor.getTime()) && valor >= inicioPeriodo(periodo) && valor <= new Date();
}

export function fechaHace(dias: number): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha.toISOString().slice(0, 10);
}
