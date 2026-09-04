const fs = require('fs');
const file = 'src/components/internal-portal/InternalPortal.part05.sourcepart';
let content = fs.readFileSync(file, 'utf8');

const target = `<input
                  type="text"
                  placeholder="Pesquisar item..."
                  value={inventoryTransactionSearch}
                  onChange={(e) => setInventoryTransactionSearch(e.target.value)}
                  className="w-full border-slate-300 rounded-lg focus:ring-royal-blue focus:border-royal-blue mb-2"
                />
                <select
                  name="itemId"
                  required
                  className="w-full border-slate-300 rounded-lg focus:ring-royal-blue focus:border-royal-blue"
                >
                  <option value="">Selecione o item...</option>
                  {inventoryItems
                    .filter(i => i.name.toLowerCase().includes((inventoryTransactionSearch || '').toLowerCase()))
                    .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Estoque: {i.quantity} {i.unit})
                    </option>
                  ))}
                </select>`;

const replacement = `<select
                  name="itemId"
                  required
                  className="w-full border-slate-300 rounded-lg focus:ring-royal-blue focus:border-royal-blue"
                >
                  <option value="">Selecione o item...</option>
                  {inventoryItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Estoque: {i.quantity} {i.unit})
                    </option>
                  ))}
                </select>`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Reverted successfully!");
} else {
    console.log("Target not found!");
}
