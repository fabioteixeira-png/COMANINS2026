import re

# part05
with open('src/components/internal-portal/InternalPortal.part05.sourcepart', 'r') as f:
    part05 = f.read()

part05 = part05.replace(
    '      )}\n\n      {selectedInstLabelToPrint && (',
    '      )}\n\n      {activeTab === "etiqueta_caixa" && canAccessModule("material_intake") && (\n        <BoxLabelSheet\n          clients={clients}\n          instruments={instruments}\n          reports={reports}\n          currentUser={currentUser}\n          canEdit={canEditMaterialIntake}\n        />\n      )}\n\n      {selectedInstLabelToPrint && ('
)

with open('src/components/internal-portal/InternalPortal.part05.sourcepart', 'w') as f:
    f.write(part05)

# part02
with open('src/components/internal-portal/InternalPortal.part02.sourcepart', 'r') as f:
    part02 = f.read()

part02 = part02.replace(
    '<div className="sticky top-0 z-30 bg-slate-50 mb-6 pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 print:static">',
    '<div className="mb-6 pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">'
)

part02 = re.sub(
    r'\s*\{activeTab === "etiqueta_caixa".*?/>\s*\)\}\n\n\s*\{activeTab === "dashboard"',
    '\n\n        {activeTab === "dashboard"',
    part02,
    flags=re.DOTALL
)

with open('src/components/internal-portal/InternalPortal.part02.sourcepart', 'w') as f:
    f.write(part02)

# script
with open('scripts/internal-portal-source.mjs', 'r') as f:
    script = f.read()
    
script = re.sub(
    r'const EXPECTED_SHA256 = ".*";',
    'const EXPECTED_SHA256 = "3690a32e09ce3d274cae87452dbc46e325dac775591683cb26d23977e5569db4";',
    script
)

with open('scripts/internal-portal-source.mjs', 'w') as f:
    f.write(script)

