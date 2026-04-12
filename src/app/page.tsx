export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight">
          Партийный документооборот МО Новоизмайловское
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Локальная программа для подготовки протоколов, отчетов, планов,
          решений и выписок по блокам ПО, МПС, МКК и ДО с AI-помощником.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <a
            href="/po"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-2xl font-semibold">Блок ПО</h2>
            <p className="mt-3 text-slate-600">
              Протоколы общих собраний, отчеты, планы, делегаты, учет членов,
              выборы секретаря и ревизора.
            </p>
          </a>

          <a
            href="/mps"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <h2 className="text-2xl font-semibold">Блок МПС</h2>
            <p className="mt-3 text-slate-600">
              Протоколы заседаний, решения, согласования, поручения, отчеты ДО,
              контроль исполнения.
            </p>
          </a>
        </div>
      </div>
    </main>
  );
}