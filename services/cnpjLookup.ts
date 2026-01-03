export type CnpjLookupResult = {
  razaoSocial?: string;
  nomeFantasia?: string;
  telefone?: string;
  endereco?: string;
};

export function onlyDigits(input: string) {
  return (input ?? '').replace(/\D/g, '');
}

export function isValidCnpj(input: string) {
  const cnpj = onlyDigits(input);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calc = (base: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += Number(base[i]) * weights[i];
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base12 = cnpj.slice(0, 12);
  const d1 = calc(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const base13 = base12 + String(d1);
  const d2 = calc(base13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${d1}${d2}`);
}

export async function lookupCnpj(input: string): Promise<CnpjLookupResult | null> {
  const cnpj = onlyDigits(input);
  if (!isValidCnpj(cnpj)) return null;

  // BrasilAPI possui CORS e costuma ser estável para consultas simples.
  const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (!resp.ok) return null;
  const data: any = await resp.json();

  const telefone =
    data?.ddd_telefone_1
      ? String(data.ddd_telefone_1)
      : data?.ddd_telefone_2
        ? String(data.ddd_telefone_2)
        : undefined;

  const enderecoParts = [
    data?.logradouro,
    data?.numero ? `nº ${data.numero}` : null,
    data?.bairro,
    data?.municipio ? `${data.municipio}${data?.uf ? `/${data.uf}` : ''}` : null,
    data?.cep ? `CEP ${data.cep}` : null,
  ].filter(Boolean);

  return {
    razaoSocial: data?.razao_social ?? undefined,
    nomeFantasia: data?.nome_fantasia ?? undefined,
    telefone,
    endereco: enderecoParts.length ? enderecoParts.join(', ') : undefined,
  };
}


