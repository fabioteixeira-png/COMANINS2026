find src/components/finance/ -name "*.tsx" -exec sed -i "s/const isSimulacao = (localStorage.getItem('finance_op_mode') || 'homologado') === 'simulacao';/const isSimulacao = false;/g" {} +
