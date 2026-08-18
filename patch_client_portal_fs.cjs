const fs = require('fs');

let content = fs.readFileSync('src/components/ClientPortal.tsx', 'utf-8');

const stateBlock = `
  const [fieldServiceRecords, setFieldServiceRecords] = useState<FieldServiceRecord[]>([]);

  useEffect(() => {
    if (client?.isFieldService) {
      const unsub = syncFieldServiceRecords((records) => {
        setFieldServiceRecords(records);
      });
      return () => {
        unsub.then(u => u());
      }
    }
  }, [client?.isFieldService]);
`;

content = content.replace(
  'const [clientIntakes, setClientIntakes] = useState<SavedIntake[]>([]);',
  'const [clientIntakes, setClientIntakes] = useState<SavedIntake[]>([]);\n' + stateBlock
);

fs.writeFileSync('src/components/ClientPortal.tsx', content);
console.log("Patched ClientPortal state.");
