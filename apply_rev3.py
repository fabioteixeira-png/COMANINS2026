import re

with open('src/components/internal-portal/InternalPortal.part05.sourcepart', 'r') as f:
    part05 = f.read()

part05 = re.sub(
    r'\s*\{activeTab === "etiqueta_caixa" && canAccessModule\("material_intake"\) && \(\s*<BoxLabelSheet\s*clients=\{clients\}\s*instruments=\{instruments\}\s*reports=\{reports\}\s*currentUser=\{currentUser\}\s*canEdit=\{canEditMaterialIntake\}\s*\/>\s*\)\}\n',
    '\n',
    part05
)

with open('src/components/internal-portal/InternalPortal.part05.sourcepart', 'w') as f:
    f.write(part05)

with open('src/components/internal-portal/InternalPortal.part02.sourcepart', 'r') as f:
    part02 = f.read()

part02 = part02.replace(
    '<div className="mb-6 pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">',
    '<div className="sticky top-0 z-30 bg-slate-50 mb-6 pb-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 print:static">'
)

insertion = """
        {activeTab === "etiqueta_caixa" && canAccessModule("material_intake") && (
          <BoxLabelSheet
            clients={clients}
            instruments={instruments}
            reports={reports}
            currentUser={currentUser}
            canEdit={canEditMaterialIntake}
          />
        )}
"""

part02 = part02.replace(
    '        {activeTab === "dashboard" && canAccessModule("dashboard") && (',
    insertion.lstrip('\n') + '\n        {activeTab === "dashboard" && canAccessModule("dashboard") && ('
)

with open('src/components/internal-portal/InternalPortal.part02.sourcepart', 'w') as f:
    f.write(part02)

with open('scripts/internal-portal-source.mjs', 'r') as f:
    script = f.read()

script = re.sub(
    r'const EXPECTED_SHA256 = ".*";',
    'const EXPECTED_SHA256 = "3f8a607e3a13b0e72a46a3f613469101b03ea59bdacf0f425d5037028820912a";',
    script
)

with open('scripts/internal-portal-source.mjs', 'w') as f:
    f.write(script)

