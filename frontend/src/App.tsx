import IngestForm from './components/IngestForm';
import ItemList from './components/ItemList';
import AskPanel from './components/AskPanel';

function PanelHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{children}</h2>;
}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-lg font-bold text-gray-900">🗂️ AI Knowledge Inbox</h1>
        <p className="text-xs text-gray-500 mt-0.5">Save notes and URLs · Ask questions · Get cited answers</p>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Panel 1 — Add Content */}
          <section>
            <PanelHeader>Add Content</PanelHeader>
            <IngestForm />
          </section>

          {/* Panel 2 — Saved Items */}
          <section>
            <PanelHeader>Saved Items</PanelHeader>
            <ItemList />
          </section>

          {/* Panel 3 — Ask */}
          <section>
            <PanelHeader>Ask</PanelHeader>
            <AskPanel />
          </section>
        </div>
      </main>
    </div>
  );
}
