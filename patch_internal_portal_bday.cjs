const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const targetStr = `  const isUserAdmin =
    currentUser?.permissionLevel === "Administrador" ||
    (!currentUser?.permissionLevel &&
      (currentUser?.role === "Administrador" ||`;

const bdayLogic = `
  const [showBirthdayModal, setShowBirthdayModal] = React.useState(false);
  const [birthdayMessage, setBirthdayMessage] = React.useState("");

  React.useEffect(() => {
    if (currentUser?.birthDate) {
      const today = new Date();
      const [year, month, day] = currentUser.birthDate.split("-");
      if (today.getMonth() + 1 === parseInt(month) && today.getDate() === parseInt(day)) {
        const hasSeen = sessionStorage.getItem(\`bday_\${currentUser.id}_\${today.getFullYear()}\`);
        if (!hasSeen) {
          fetch("/api/generate-birthday-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: currentUser.name }),
          })
            .then((res) => res.json())
            .then((data) => {
              setBirthdayMessage(data.message);
              setShowBirthdayModal(true);
              sessionStorage.setItem(\`bday_\${currentUser.id}_\${today.getFullYear()}\`, "true");
            })
            .catch(() => {
              setBirthdayMessage(\`Feliz Aniversário, \${currentUser.name}!\`);
              setShowBirthdayModal(true);
              sessionStorage.setItem(\`bday_\${currentUser.id}_\${today.getFullYear()}\`, "true");
            });
        }
      }
    }
  }, [currentUser]);

`;

code = code.replace(targetStr, bdayLogic + targetStr);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
