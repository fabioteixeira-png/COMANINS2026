const fs = require('fs');
let content = fs.readFileSync('src/components/InternalPortal.tsx', 'utf-8');

const target2 = `                    </div>map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                        
                        

                    </div>`;

content = content.replace(target2, '                    </div>');

fs.writeFileSync('src/components/InternalPortal.tsx', content);
console.log("Success");
