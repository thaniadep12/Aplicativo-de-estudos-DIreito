export interface Topic {
  name: string;
  description: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  topics: Topic[];
}

export const subjects: Subject[] = [
  {
    id: "constitucional",
    name: "Direito Constitucional",
    icon: "Shield",
    topics: [
      { name: "Teoria da Constituição", description: "Conceito, classificação, elementos e histórico das Constituições Brasileiras." },
      { name: "Poder Constituinte", description: "Originário, Derivado (Reformador, Decorrente e Revisor) e Poder Constituinte Difuso." },
      { name: "Hermenêutica Constitucional", description: "Métodos de interpretação, princípios de interpretação e eficácia das normas." },
      { name: "Princípios Fundamentais", description: "Fundamentos, Poderes, Objetivos e Princípios das Relações Internacionais (Arts. 1º a 4º)." },
      { name: "Direitos Individuais e Coletivos", description: "Vida, Liberdade, Igualdade, Segurança e Propriedade (Art. 5º da CF)." },
      { name: "Remédios Constitucionais", description: "HC, HD, MS, MI, Ação Popular e Reclamação Constitucional." },
      { name: "Direitos Sociais", description: "Trabalho, Saúde, Educação, Previdência e Assistência Social (Arts. 6º a 11)." },
      { name: "Nacionalidade e Direitos Políticos", description: "Brasileiros Natos/Naturalizados, Perda da Nacionalidade e Capacidade Eleitoral." },
      { name: "Partidos Políticos", description: "Autonomia, Fidelidade Partidária e Fundo Partidário (Art. 17)." },
      { name: "Organização do Estado", description: "Forma de Estado, Entes Federados, Competências da União, Estados, DF e Municípios." },
      { name: "Intervenção Federal e Estadual", description: "Pressupostos, Decretos e Controle Político/Judiciário." },
      { name: "Administração Pública", description: "Princípios (LIMPE), Concursos, Agentes Públicos e Responsabilidade Civil do Estado." },
      { name: "Poder Legislativo", description: "Câmara, Senado, Congresso Nacional e Estatuto dos Parlamentares." },
      { name: "Processo Legislativo", description: "Emendas, Leis Complementares, Ordinárias, Delegadas e Medidas Provisórias." },
      { name: "Poder Executivo", description: "Eleição, Atribuições, Crimes de Responsabilidade e Impeachment." },
      { name: "Poder Judiciário", description: "Garantias, Vedações, STF, STJ, CNJ e Tribunais Regionais/Estaduais." },
      { name: "Controle de Constitucionalidade", description: "Sistemas, Modelos, Vias: ADI, ADC, ADO, ADPF e Controle Difuso." },
      { name: "Funções Essenciais à Justiça", description: "Ministério Público, Advocacia Pública/Privada e Defensoria Pública." },
      { name: "Defesa do Estado e Instituições", description: "Estado de Defesa, Estado de Sítio, Forças Armadas e Segurança Pública." },
      { name: "Tributação e Orçamento", description: "Sistema Tributário Nacional, Princípios e Leis Orçamentárias (PPA, LDO, LOA)." },
      { name: "Ordem Econômica e Financeira", description: "Princípios da Atividade Econômica e Sistema Financeiro Nacional." },
      { name: "Ordem Social", description: "Seguridade Social, Educação, Cultura, Família, Adolescente e Idoso, Meio Ambiente e Índios." }
    ]
  },
  {
    id: "empresarial",
    name: "Direito Empresarial",
    icon: "Briefcase",
    topics: [
      { name: "Teoria Geral e Empresa", description: "Conceitos, Empresário Individual, EIRELI (SLU) e Capacidade para Exercer Empresa." },
      { name: "Registro e Escrituração", description: "Registro Público de Empresas Mercantis, Juntas Comerciais e Livros Obrigatórios." },
      { name: "Estabelecimento Empresarial", description: "Elementos, Natureza Jurídica, Proteção ao Ponto e Contrato de Trespasse." },
      { name: "Propriedade Industrial", description: "Invenções, Modelos de Utilidade, Marcas, Desenho Industrial e Concorrência Desleal." },
      { name: "Nome Empresarial", description: "Firma, Denominação, Proteção Jurídica e Alterações do Nome." },
      { name: "Prepostos do Empresário", description: "Gerente, Contabilista e a Responsabilidade Civil perante terceiros." },
      { name: "Direito Societário Geral", description: "Ato Constitutivo, Personalização, Sociedade de Fato e Desconsideração da Personalidade." },
      { name: "Sociedade Simples", description: "Constituição, Direitos e Obrigações dos Sócios, Administração e Dissolução." },
      { name: "Sociedade Limitada", description: "Responsabilidade, Quotas, Administração, Conselho Fiscal e Retirada de Sócio." },
      { name: "Sociedades Anônimas", description: "Capital Social, Ações, Debêntures, Governança e Deveres dos Administradores." },
      { name: "Operações Societárias", description: "Transformação, Incorporação, Fusão e Cisão de Sociedades." },
      { name: "Sociedades Coligadas e Grupos", description: "Controladora, Controlada e Grupos de Sociedades." },
      { name: "Títulos de Crédito Gerais", description: "Princípios (Cartularidade, Literalidade, Autonomia), Endosso, Aval e Aceite." },
      { name: "Títulos em Espécie", description: "Letra de Câmbio, Nota Promissória, Cheque, Duplicata e Títulos Agronegócio." },
      { name: "Contratos Mercantis", description: "Compra e Venda, Distribuição, Franquia, Leasing e Cartão de Crédito." },
      { name: "Recuperação Judicial", description: "Lei 11.101/05: Requisitos, Procedimento e o Plano de Recuperação." },
      { name: "Recuperação Extrajudicial", description: "Espécies de Planos e Homologação Judicial." },
      { name: "Falência", description: "Pressupostos, Pedido, Sentença, Arrecadação de Bens e Ordem de Pagamento de Credores." },
      { name: "Crimes Falimentares", description: "Tipicidade e Procedimento Penal na Lei de Falência." }
    ]
  },
  {
    id: "civil",
    name: "Direito Civil",
    icon: "BookScale",
    topics: [
      { name: "LINDB", description: "Vigência, Revogação, Vacatio Legis, Obrigatoriedade e Integração da Norma." },
      { name: "Pessoas Naturais", description: "Personalidade, Capacidade, Individualização, Ausência e Direitos da Personalidade." },
      { name: "Pessoas Jurídicas", description: "Classificação, Constituição, Grupos Despersonalizados e Extinção." },
      { name: "Domicílio e Residência", description: "Domicílio da Pessoa Natural e Jurídica, Domicílio Necessário e Eleição." },
      { name: "Bens", description: "Móveis/Imóveis, Fungíveis, Consumíveis, Divisíveis e Bens Públicos." },
      { name: "Fatos e Negócios Jurídicos", description: "Elementos, Planos de Existência, Validade e Eficácia." },
      { name: "Defeitos do Negócio Jurídico", description: "Erro, Dolo, Coação, Estado de Perigo, Lesão e Fraude contra Credores." },
      { name: "Invalidade e Nulidade", description: "Nulidade Absoluta, Relativa (Anulabilidade) e Simulação." },
      { name: "Prescrição e Decadência", description: "Prazos, Causas de Interrupção/Suspensaão e Renúncia." },
      { name: "Obrigações Gerais", description: "Dar, Fazer, Não Fazer, Solidárias, Alternativas e Indivisíveis." },
      { name: "Adimplemento das Obrigações", description: "Pagamento, Consignação, Sub-rogação, Imputação e Dação em Pagamento." },
      { name: "Extinção sem Pagamento", description: "Novação, Compensação, Confusão e Remissão de Dívidas." },
      { name: "Inadimplemento", description: "Mora, Perdas e Danos, Juros Legais e Cláusula Penal." },
      { name: "Responsabilidade Civil", description: "Objetiva/Subjetiva, Nexo Causal, Excludentes e Cálculo da Indenização." },
      { name: "Contratos Gerais", description: "Função Social, Boa-fé Objetiva, Estipulação para Terceiro, Vícios e Evicção." },
      { name: "Contratos em Espécie I", description: "Compra e Venda, Troca, Contrato Estimatório e Doação." },
      { name: "Contratos em Espécie II", description: "Locação, Empréstimo (Comodato/Mútuo), Prestação de Serviço e Empreitada." },
      { name: "Posse", description: "Classificação, Aquisição e Perda, Interditos Possessórios." },
      { name: "Propriedade", description: "Usucapião, Aquisição Imobiliária/Mobiliária, Condomínio Edilício e Direitos de Vizinhança." },
      { name: "Direitos Reais sobre Coisa Alheia", description: "Superfície, Servidão, Usufruto, Uso, Habitação e Alienação Fiduciária." },
      { name: "Direito de Família I", description: "Casamento, Impedimentos, Regimes de Bens e Divórcio." },
      { name: "Direito de Família II", description: "União Estável, Filiação, Parentesco, Alimentos e Guarda." },
      { name: "Direito das Sucessões I", description: "Herança, Sucessão Legítima, Ordem de Vocação Hereditária e Petição de Herança." },
      { name: "Direito das Sucessões II", description: "Testamento, Legados, Deserdação, Inventário e Partilha." }
    ]
  }
];
