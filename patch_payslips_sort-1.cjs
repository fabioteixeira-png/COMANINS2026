const fs = require('fs');
let code = fs.readFileSync('src/components/InternalPortal.tsx', 'utf8');

const target = `                        <tbody className="divide-y divide-slate-100">
                          {payslips.map((p) => (
                            <tr`;

const replace = `                        <tbody className="divide-y divide-slate-100">
                          {[...payslips]
                            .sort((a, b) => (a.employeeName || "").localeCompare(b.employeeName || ""))
                            .map((p) => (
                            <tr`;

code = code.replace(target, replace);
fs.writeFileSync('src/components/InternalPortal.tsx', code);
