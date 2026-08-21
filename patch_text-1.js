import fs from 'fs';
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf-8');

code = code.replace(
  'Primeiro Acesso - Alteração de Senha',
  'Atualização de Segurança'
);

code = code.replace(
  'Identificamos que este é o seu primeiro acesso utilizando a <strong>senha padrão/temporária</strong>. Para a segurança do seu usuário e em conformidade com as diretrizes da COMANINS, por favor cadastre sua <strong>senha pessoal</strong>.',
  'Identificamos que este é o seu primeiro acesso após a atualização do portal COMANINS. Como medida de segurança, por favor cadastre uma nova <strong>senha pessoal</strong> (com no mínimo 10 caracteres contendo: letra maiúscula, letra minúscula, número e caractere especial).'
);

fs.writeFileSync('src/components/LoginScreen.tsx', code);
