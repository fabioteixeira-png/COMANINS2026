const fs = require('fs');
const content = fs.readFileSync('src/components/InternalPortal_clean.tsx', 'utf8');

const validTags = ['div', 'span', 'p', 'a', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'button', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'label', 'form', 'select', 'option', 'textarea', 'strong', 'em', 'b', 'i', 'svg', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon'];
const knownComponents = ['AccessAuditLog', 'Activity', 'AlertCircle', 'AlertTriangle', 'ArrowRight', 'Award', 'Briefcase', 'Calendar', 'CalibrationAuditLog', 'CalibrationLabelArtwork', 'CalibrationLabelData', 'Camera', 'CertSequenceConfig', 'CheckCircle', 'CheckSquare', 'ChevronDown', 'ChevronRight', 'Client', 'ClipboardCheck', 'Clock', 'ComaninsLogo', 'Database', 'Download', 'DropdownOptions', 'Edit', 'EmployeeDocument', 'ExamTypeItem', 'Eye', 'File', 'FileCheck', 'FileText', 'Gauge', 'Instrument', 'InstrumentType', 'Layers', 'MedicalExam', 'Menu', 'MessageSquare', 'NotificationBellPopover', 'Package', 'Payslip', 'PayslipItem', 'PenTool', 'Plus', 'Printer', 'QRCodeSVG', 'ReferenceStandard', 'RefreshCw', 'RncReport', 'SavedIntake', 'Search', 'Settings', 'ShieldAlert', 'ShieldCheck', 'Sliders', 'Stethoscope', 'Tag', 'Trash2', 'TrendingUp', 'Upload', 'X'];

// Regex to find JSX tags. It's tough because of TS generics. We'll only consider <tag or </tag
const tagRegex = /<\/?([a-zA-Z0-9]+)[\s>]/g;
let match;
const tags = [];

// Remove contents of quotes to avoid tags inside strings
let code = content.replace(/`(?:\\.|[^`])*`/g, '""').replace(/'(?:\\.|[^'])*'/g, '""').replace(/"(?:\\.|[^"])*"/g, '""');

while ((match = tagRegex.exec(code)) !== null) {
    const tagName = match[1];
    const isClose = match[0].startsWith('</');
    
    // check if it's a valid tag
    if (!validTags.includes(tagName) && !knownComponents.includes(tagName)) {
        continue;
    }

    // Check if it's self closing. Actually regex doesn't capture the end of the tag easily.
    // Let's find the closing > of this tag
    const closeIdx = code.indexOf('>', match.index);
    if (closeIdx !== -1) {
        const fullTag = code.substring(match.index, closeIdx + 1);
        if (fullTag.endsWith('/>')) {
            continue; // self closing
        }
    }

    if (isClose) {
        if (tags.length > 0 && tags[tags.length - 1] === tagName) {
            tags.pop();
        } else {
            let found = -1;
            for(let i = tags.length-1; i>=0; i--) {
                if(tags[i] === tagName) {
                    found = i;
                    break;
                }
            }
            if (found !== -1) {
                tags.splice(found, tags.length - found);
            }
        }
    } else {
        tags.push(tagName);
    }
}

console.log("Open tags remaining:", tags);
