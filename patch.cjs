const fs = require('fs');
let content = fs.readFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', 'utf8');

content = content.replace(
  'const [clientName, setClientName] = useState<any>("");',
  'const [clientName, setClientName] = useState<any>("");\n  const [clientSubmitting, setClientSubmitting] = useState(false);'
);

content = content.replace(
  'const handleClientSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();',
  `const handleClientSubmit = async (e: React.FormEvent) => {\n    e.preventDefault();\n    if (clientSubmitting) return;\n    setClientSubmitting(true);`
);

content = content.replace(
  '      setClientIsFieldService(false);\n      setClientEmail("");\n      setClientPhone("");\n      setClientCity("");\n      setEditingClient(null);\n    } catch (error) {\n      console.error("Error saving client:", error);\n      alert("Ocorreu um erro ao salvar o cliente. Verifique o console.");\n    }\n  };',
  '      setClientIsFieldService(false);\n      setClientEmail("");\n      setClientPhone("");\n      setClientCity("");\n      setEditingClient(null);\n    } catch (error) {\n      console.error("Error saving client:", error);\n      alert("Ocorreu um erro ao salvar o cliente. Verifique o console.");\n    } finally {\n      setClientSubmitting(false);\n    }\n  };'
);

fs.writeFileSync('src/components/internal-portal/InternalPortal.part01.sourcepart', content);
