const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado",
];

export function Topbar({ name }: { name: string }) {
  const now = new Date();
  const fecha = `${DIAS[now.getDay()]}, ${now.getDate()} de ${MESES[now.getMonth()]}`;
  const firstName = name.split(" ")[0];

  return (
    <div className="flex items-baseline justify-between gap-4 px-6 md:px-8 py-6 border-b border-border">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Buenos días, {firstName} 👋
        </h1>
        <p className="text-sm text-ink-dim mt-1 capitalize">{fecha}</p>
      </div>
    </div>
  );
}
