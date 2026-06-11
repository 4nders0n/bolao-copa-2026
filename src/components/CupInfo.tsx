export function CupInfo() {
  const startDate = new Date("2026-06-11T19:00:00Z");
  const now = new Date();
  const diff = startDate.getTime() - now.getTime();
  const hoursToStart = Math.ceil(diff / (1000 * 60 * 60));
  const daysToStart = Math.ceil(diff / (1000 * 60 * 60 * 24));

  let countdownContent;
  if (diff <= 0) {
    countdownContent = (
      <div className="text-center rounded-lg bg-green-100 px-4 py-2 border border-green-200">
        <div className="text-lg font-bold text-green-700">🔴 AO VIVO</div>
        <div className="text-xs text-green-600">Copa em andamento!</div>
      </div>
    );
  } else if (hoursToStart <= 24) {
    countdownContent = (
      <div className="text-center rounded-lg bg-yellow-50 px-4 py-2 shadow-sm border border-yellow-200">
        <div className="text-2xl font-bold text-yellow-600">HOJE</div>
        <div className="text-xs text-yellow-700">
          Início às 16h (Brasília)
        </div>
      </div>
    );
  } else {
    countdownContent = (
      <div className="text-center rounded-lg bg-white px-4 py-2 shadow-sm border">
        <div className="text-2xl font-bold text-blue-600">{daysToStart}</div>
        <div className="text-xs text-gray-500">
          {daysToStart === 1 ? "dia para o início" : "dias para o início"}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-green-50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            🏆 Copa do Mundo FIFA 2026
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            🇺🇸 🇨🇦 🇲🇽 Estados Unidos, Canadá e México
          </p>
        </div>

        {countdownContent}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-3 text-center shadow-sm border">
          <div className="text-xl font-bold text-gray-800">48</div>
          <div className="text-xs text-gray-500">Seleções</div>
        </div>
        <div className="rounded-lg bg-white p-3 text-center shadow-sm border">
          <div className="text-xl font-bold text-gray-800">104</div>
          <div className="text-xs text-gray-500">Jogos</div>
        </div>
        <div className="rounded-lg bg-white p-3 text-center shadow-sm border">
          <div className="text-xl font-bold text-gray-800">12</div>
          <div className="text-xs text-gray-500">Grupos</div>
        </div>
        <div className="rounded-lg bg-white p-3 text-center shadow-sm border">
          <div className="text-xl font-bold text-gray-800">16</div>
          <div className="text-xs text-gray-500">Cidades-sede</div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>📅 11 de junho — 19 de julho de 2026</p>
        <p className="mt-1">🏟️ Final: MetLife Stadium, Nova Jersey (EUA)</p>
      </div>

      <div className="mt-4 rounded-lg bg-white p-3 border">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">📊 Pontuação do Bolão</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Placar exato</span>
            <span className="font-bold text-green-600">10 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Vencedor + saldo</span>
            <span className="font-bold text-blue-600">7 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Acertou vencedor</span>
            <span className="font-bold text-yellow-600">5 pts</span>
          </div>
          <div className="flex justify-between">
            <span>Errou</span>
            <span className="font-bold text-gray-400">0 pts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
