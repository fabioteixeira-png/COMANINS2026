const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeManagement.tsx', 'utf8');

const target1 = `      let fileDataUrl = newNrCertificateUrl;
      if (newNrCertificateFile) {
        fileDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(newNrCertificateFile);
        }) as string;
      }`;

const replacement1 = `      let fileDataUrl = newNrCertificateUrl;
      if (newNrCertificateFile) {
        if (newNrCertificateFile.type.startsWith('image/')) {
          fileDataUrl = await compressImageToWebResolution(newNrCertificateFile, 1200, 1200, 0.7);
        } else {
          if (newNrCertificateFile.size > 700 * 1024) {
            alert("O arquivo do certificado é muito grande (" + (newNrCertificateFile.size / 1024).toFixed(1) + "KB). O tamanho máximo permitido é 700KB.");
            setIsSavingNrTraining(false);
            return;
          }
          fileDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(newNrCertificateFile);
          });
        }
      }`;

code = code.replace(target1, replacement1);

const target2 = `                                      <div className="flex items-center space-x-1.5">
                                        {rec.certificateUrl && (
                                          <a
                                            href={rec.certificateUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-1 text-royal-blue hover:bg-blue-50 rounded transition-colors"
                                            title="Ver Certificado"
                                          >
                                            <Eye className="h-4 w-4" />
                                          </a>
                                        )}
                                        {isUserAdmin && (`;

const replacement2 = `                                      <div className="flex items-center space-x-1.5">
                                        {rec.certificateUrl && (
                                          <div className="flex items-center space-x-1">
                                            <a
                                              href={rec.certificateUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="p-1 text-royal-blue hover:bg-blue-50 rounded transition-colors"
                                              title="Ver Certificado"
                                            >
                                              <Eye className="h-4 w-4" />
                                            </a>
                                            <a
                                              href={rec.certificateUrl}
                                              download={\`Certificado_\${name.replace(/\\s+/g, '_')}_\${currentEmpName?.replace(/\\s+/g, '_') || 'Colaborador'}\`}
                                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                              title="Baixar Certificado"
                                            >
                                              <Download className="h-4 w-4" />
                                            </a>
                                          </div>
                                        )}
                                        {isUserAdmin && (`;

code = code.replace(target2, replacement2);

const target3 = `    } catch (err) {
      console.error('Erro ao lançar treinamento de NR:', err);
      alert('Ocorreu um erro ao lançar o treinamento.');
    } finally {`;

const replacement3 = `    } catch (err: any) {
      console.error('Erro ao lançar treinamento de NR:', err);
      alert('Ocorreu um erro ao lançar o treinamento: ' + (err.message || err.toString()));
    } finally {`;

code = code.replace(target3, replacement3);
fs.writeFileSync('src/components/EmployeeManagement.tsx', code);
