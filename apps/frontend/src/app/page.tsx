export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-blue-600">PanificaPro</h1>
      <p className="mt-4 text-xl">Sistema de Gerenciamento de Produção para Padarias</p>
      <div className="mt-8 flex gap-4">
        <a href="/login" className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
          Entrar
        </a>
      </div>
    </main>
  );
}
