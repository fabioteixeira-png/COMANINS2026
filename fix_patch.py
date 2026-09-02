import re

with open('COMANINS_LOTE_25_REV2_LAYOUT_ROLAGEM_ETIQUETA_CAIXA.patch', 'r') as f:
    content = f.read()

# Remove the index line for the image
content = re.sub(r'index [0-9a-f]+\.\.[0-9a-f]+( [0-9]+)?\n', '', content)
with open('fixed.patch', 'w') as f:
    f.write(content)
