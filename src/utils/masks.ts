/**
 * Utility mask functions for Brazilian input fields (CNPJ, CPF, Telefone, CEP)
 */

export function maskCNPJ(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return digits.replace(/^(\d{2})(\d)/, '$1.$2');
  if (digits.length <= 8) return digits.replace(/^(\d{2})(\d{3})(\d)/, '$1.$2.$3');
  if (digits.length <= 12) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3/$4');
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5');
}

export function maskCPF(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.replace(/^(\d{3})(\d)/, '$1.$2');
  if (digits.length <= 9) return digits.replace(/^(\d{3})(\d{3})(\d)/, '$1.$2.$3');
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
}

export function maskCpfCnpj(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return maskCPF(digits);
  }
  return maskCNPJ(digits);
}

export function maskPhone(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return digits.replace(/^(\d{2})(\d)/, '($1) $2');
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d)/, '($1) $2-$3');
  return digits.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
}

export function maskCEP(val: string): string {
  if (!val) return '';
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return digits.replace(/^(\d{5})(\d{1,3})/, '$1-$2');
}
