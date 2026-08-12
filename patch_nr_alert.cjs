const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target1 = `        } else {
          if (newNrCertificateFile.size > 700 * 1024) {
            alert("O arquivo do certificado é muito grande (" + (newNrCertificateFile.size / 1024).toFixed(1) + "KB). O tamanho máximo permitido é 700KB.");
            setIsSavingNrTraining(false);
            return;
          }`;

const replacement1 = `        } else {
          if (newNrCertificateFile.size > 500 * 1024) {
            alert("O arquivo do certificado (PDF) é muito grande (" + (newNrCertificateFile.size / 1024).toFixed(1) + "KB). O tamanho máximo permitido para salvar no banco é de 500KB. Reduza o arquivo e tente novamente.");
            setIsSavingNrTraining(false);
            return;
          }`;

code = code.replace(target1, replacement1);

const target2 = `    } catch (err: any) {
      console.error('Erro ao lançar treinamento de NR:', err);
      alert('Ocorreu um erro ao lançar o treinamento: ' + (err.message || err.toString()));
    } finally {`;

const replacement2 = `    } catch (err: any) {
      console.error('Erro ao lançar treinamento de NR:', err);
      alert('Ocorreu um erro ao salvar no banco de dados. Tente sem o anexo primeiro ou verifique a conexão: ' + (err.message || err.toString()));
    } finally {`;

code = code.replace(target2, replacement2);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
