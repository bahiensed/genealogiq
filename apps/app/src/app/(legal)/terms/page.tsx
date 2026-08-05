import { getTranslations } from "next-intl/server"
import { Mail, MapPin, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const TOC = [
  { id: "identificacao", label: "1. Identificação da Empresa" },
  { id: "termos-de-uso", label: "2. Termos de Uso" },
  { id: "politica-de-privacidade", label: "3. Política de Privacidade" },
  { id: "clausulas-finais", label: "4. Cláusulas de Blindagem Final" },
]

const TERMS_SECTIONS = [
  {
    id: "2-1",
    title: "2.1. Aceitação",
    body: (
      <p>
        Ao acessar ou utilizar a plataforma Genealogiq, o usuário declara que leu, compreendeu e
        concorda integralmente com estes Termos de Uso e com a Política de Privacidade.
      </p>
    ),
  },
  {
    id: "2-2",
    title: "2.2. Definição do serviço",
    body: (
      <>
        <p>A Genealogiq é uma plataforma digital que permite:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Criação e gestão de memoriais digitais</li>
          <li>Armazenamento de fotos, vídeos, áudios e histórias</li>
          <li>Construção de árvore genealógica</li>
          <li>Geolocalização de lápides e registros memoriais</li>
          <li>Gestão de perfis por um responsável denominado &ldquo;Guardião&rdquo;</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-3",
    title: "2.3. Elegibilidade",
    body: (
      <p>
        O uso da plataforma é permitido apenas para maiores de 18 anos ou mediante autorização
        legal de responsável.
      </p>
    ),
  },
  {
    id: "2-4",
    title: "2.4. Responsabilidade do usuário",
    body: (
      <>
        <p>O usuário declara que:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Possui autorização sobre os conteúdos inseridos</li>
          <li>Não viola direitos de terceiros</li>
          <li>Utiliza a plataforma de forma legal e ética</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-5",
    title: "2.5. Conteúdo sensível e direitos pós-morte",
    body: (
      <>
        <p>
          A plataforma lida com dados relacionados a pessoas falecidas. O usuário assume integral
          responsabilidade por:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Veracidade das informações</li>
          <li>Direito de uso de imagem e dados</li>
          <li>Eventuais disputas familiares ou legais</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-6",
    title: "2.6. Guardião (administrador do legado)",
    body: (
      <>
        <p>O &ldquo;Guardião&rdquo; é o responsável pela gestão do memorial. A Genealogiq:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Não interfere em conflitos familiares</li>
          <li>Não define titularidade de dados</li>
          <li>Pode intervir apenas em casos de violação legal</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-7",
    title: "2.7. Inteligência Artificial (IA)",
    body: (
      <>
        <p>A plataforma poderá utilizar inteligência artificial para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Organização automática de memórias</li>
          <li>Sugestão de conexões familiares</li>
          <li>Geração de linhas do tempo e conteúdos</li>
        </ul>
        <p>O usuário reconhece que:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>A IA possui caráter probabilístico</li>
          <li>Pode conter imprecisões</li>
          <li>Não substitui validação humana</li>
          <li>Não deve ser utilizada como base exclusiva para decisões relevantes</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-8",
    title: "2.8. Integrações e APIs",
    body: (
      <>
        <p>A Genealogiq poderá integrar-se a terceiros, incluindo:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Plataformas de genealogia</li>
          <li>Bases de dados públicas e privadas</li>
          <li>Serviços de geolocalização</li>
          <li>Sistemas de inteligência artificial</li>
        </ul>
        <p>
          O usuário concorda que tais integrações podem envolver compartilhamento de dados
          conforme esta política.
        </p>
      </>
    ),
  },
  {
    id: "2-9",
    title: "2.9. Uso proibido",
    body: (
      <>
        <p>É vedado:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Publicar conteúdo ilegal, ofensivo ou difamatório</li>
          <li>Utilizar dados sem autorização</li>
          <li>Realizar engenharia reversa</li>
          <li>Usar a plataforma para fins fraudulentos</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-10",
    title: "2.10. Remoção de conteúdo",
    body: (
      <>
        <p>A Genealogiq poderá remover conteúdos ou contas que:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Violarem leis ou estes termos</li>
          <li>Receberem denúncias fundamentadas</li>
          <li>Representarem risco jurídico ou reputacional</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-11",
    title: "2.11. Relação com parceiros (funerárias, cemitérios e terceiros)",
    body: (
      <>
        <p>
          A Genealogiq poderá ser comercializada ou disponibilizada ao usuário final por meio de
          parceiros. O usuário declara ciência de que:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            A Genealogiq não possui responsabilidade sobre negociações, promessas ou condições
            comerciais feitas por parceiros
          </li>
          <li>Não garante ou valida serviços prestados por terceiros</li>
          <li>A relação comercial com parceiros é de responsabilidade exclusiva do usuário</li>
          <li>Problemas com parceiros devem ser resolvidos diretamente com eles</li>
        </ul>
        <p>A responsabilidade da Genealogiq limita-se a:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Disponibilização da plataforma</li>
          <li>Funcionamento das funcionalidades contratadas</li>
          <li>Experiência tecnológica conforme o plano adquirido</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-12",
    title: "2.12. Planos e cobrança",
    body: (
      <>
        <p>Plano Gratuito com limitações.</p>
        <p>Planos Pagos:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Plano Década</strong> — R$ 9,90/mês ou R$ 99,90/ano
          </li>
          <li>
            <strong>Plano Século</strong> — R$ 49,90/mês ou R$ 499,90/ano
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "2-13",
    title: "2.13. Pagamento, cancelamento e reembolso",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Cobrança recorrente automática</li>
        <li>Cancelamento a qualquer momento</li>
        <li>
          Reembolsos realizados via App Store ou Google Play seguem exclusivamente as políticas
          dessas plataformas
        </li>
        <li>
          Pagamentos via lojas de aplicativos seguem exclusivamente as políticas da Apple App
          Store e Google Play Store
        </li>
      </ul>
    ),
  },
  {
    id: "2-14",
    title: "2.14. Conta inativa e falecimento do usuário",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>O memorial poderá permanecer ativo</li>
        <li>O Guardião assume a gestão</li>
        <li>
          Na ausência de Guardião, a Genealogiq poderá decidir sobre manutenção ou encerramento
        </li>
      </ul>
    ),
  },
  {
    id: "2-15",
    title: "2.15. Propriedade intelectual",
    body: <p>Todo o sistema, tecnologia, marca e estrutura pertencem à Genealogiq.</p>,
  },
  {
    id: "2-16",
    title: "2.16. Limitação de responsabilidade",
    body: (
      <>
        <p>
          A responsabilidade da Genealogiq está limitada ao valor pago pelo usuário nos últimos
          12 meses. A empresa não se responsabiliza por:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Conteúdo de usuários</li>
          <li>Conflitos familiares</li>
          <li>Uso indevido da plataforma</li>
          <li>Impactos emocionais decorrentes do uso da plataforma</li>
          <li>Interpretação subjetiva dos conteúdos</li>
        </ul>
        <p>
          A plataforma não constitui suporte psicológico, terapêutico ou emocional.
        </p>
      </>
    ),
  },
  {
    id: "2-17",
    title: "2.17. Disponibilidade e falhas técnicas",
    body: (
      <>
        <p>A Genealogiq não garante:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Disponibilidade contínua</li>
          <li>Ausência de falhas</li>
          <li>Operação ininterrupta</li>
        </ul>
        <p>Não se responsabiliza por:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Perda de dados</li>
          <li>Ataques cibernéticos</li>
          <li>Falhas de servidores</li>
          <li>Problemas em integrações externas</li>
        </ul>
      </>
    ),
  },
  {
    id: "2-18",
    title: "2.18. Suspensão e encerramento",
    body: (
      <>
        <p>A Genealogiq pode suspender ou excluir contas que violem estes termos.</p>
        <p>A empresa poderá, a qualquer momento:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Modificar funcionalidades</li>
          <li>Suspender serviços</li>
          <li>Encerrar a plataforma</li>
        </ul>
        <p>Mediante aviso prévio razoável.</p>
      </>
    ),
  },
  {
    id: "2-19",
    title: "2.19. Legislação e foro",
    body: (
      <p>
        Este contrato é regido pelas leis brasileiras. Fica eleito o foro da comarca de Passo
        Fundo/RS.
      </p>
    ),
  },
]

const PRIVACY_SECTIONS = [
  {
    id: "3-1",
    title: "3.1. Dados coletados",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Dados pessoais (nome, e-mail, telefone)</li>
        <li>Conteúdos inseridos</li>
        <li>Dados técnicos (IP, dispositivo, cookies)</li>
      </ul>
    ),
  },
  {
    id: "3-2",
    title: "3.2. Finalidade",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Operação da plataforma</li>
        <li>Personalização</li>
        <li>Segurança</li>
        <li>Comunicação</li>
      </ul>
    ),
  },
  {
    id: "3-3",
    title: "3.3. Base legal",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Consentimento</li>
        <li>Execução de contrato</li>
        <li>Interesse legítimo</li>
      </ul>
    ),
  },
  {
    id: "3-4",
    title: "3.4. Compartilhamento",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Provedores de infraestrutura</li>
        <li>Parceiros tecnológicos</li>
        <li>Autoridades legais</li>
      </ul>
    ),
  },
  {
    id: "3-5",
    title: "3.5. Transferência internacional",
    body: <p>Os dados podem ser armazenados fora do Brasil.</p>,
  },
  {
    id: "3-6",
    title: "3.6. Segurança",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Criptografia</li>
        <li>Controle de acesso</li>
        <li>Monitoramento contínuo</li>
      </ul>
    ),
  },
  {
    id: "3-7",
    title: "3.7. Direitos do usuário",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>Acessar dados</li>
        <li>Corrigir informações</li>
        <li>Solicitar exclusão</li>
        <li>Revogar consentimento</li>
      </ul>
    ),
  },
  {
    id: "3-8",
    title: "3.8. Retenção",
    body: <p>Dados mantidos conforme necessidade legal e operacional.</p>,
  },
  {
    id: "3-9",
    title: "3.9. Encarregado de dados (DPO)",
    body: (
      <p>
        E-mail:{" "}
        <a href="mailto:bigdata@genealogiqglobal.com" className="underline underline-offset-3">
          bigdata@genealogiqglobal.com
        </a>
      </p>
    ),
  },
  {
    id: "3-10",
    title: "3.10. Cookies",
    body: (
      <>
        <p>Utilizados para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Melhorar experiência</li>
          <li>Análise de uso</li>
          <li>Personalização</li>
        </ul>
      </>
    ),
  },
  {
    id: "3-11",
    title: "3.11. Atualizações",
    body: <p>Este documento pode ser atualizado a qualquer momento.</p>,
  },
]

const FINAL_CLAUSES = [
  "Legado digital não garante perpetuidade absoluta",
  "IA não constitui verdade absoluta",
  "Responsabilidade total do usuário sobre conteúdos",
  "Não mediação de conflitos familiares",
  "Limitação financeira da empresa",
  "Possibilidade de alteração ou encerramento da plataforma",
  "Estrutura preparada para operação global",
]

export default async function TermsPage() {
  const t = await getTranslations("Legal")

  return (
    <main className="container relative pt-24 pb-32">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-4xl font-semibold tracking-tight">{t("termsTitle")}</h1>
        <p className="mt-4 text-muted-foreground">
          Termos de Uso e Política de Privacidade da Genealogiq Global LTDA, em conformidade com
          a Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <ul className="sticky top-24 space-y-2 border-l pl-4 text-sm text-muted-foreground">
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="transition-colors hover:text-foreground">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-12">
          <section id="identificacao" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">1. Identificação da Empresa</h2>
            <Card className="mt-4">
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Genealogiq Global LTDA</p>
                    <p className="text-muted-foreground">CNPJ 65.360.796/0001-39</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Av. Brasil Oeste, 1111,
                    <br />
                    Centro, Passo Fundo, RS
                    <br />
                    CEP 99025-013
                  </p>
                </div>
                <div className="flex items-start gap-3 sm:col-span-2">
                  <Mail className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <a
                    href="mailto:douglaspedroso@genealogiqglobal.com"
                    className="text-muted-foreground underline underline-offset-3 hover:text-foreground"
                  >
                    douglaspedroso@genealogiqglobal.com
                  </a>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="termos-de-uso" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">2. Termos de Uso</h2>
            <div className="mt-4 space-y-8">
              {TERMS_SECTIONS.map((section) => (
                <div key={section.id}>
                  <h3 className="font-medium">{section.title}</h3>
                  <div className="mt-2 text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4">
                    {section.body}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="politica-de-privacidade" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">
              3. Política de Privacidade
            </h2>
            <div className="mt-4 space-y-8">
              {PRIVACY_SECTIONS.map((section) => (
                <div key={section.id}>
                  <h3 className="font-medium">{section.title}</h3>
                  <div className="mt-2 text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4">
                    {section.body}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="clausulas-finais" className="scroll-mt-24">
            <h2 className="text-2xl font-semibold tracking-tight">
              4. Cláusulas de Blindagem Final
            </h2>
            <Card className="mt-4">
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
                  {FINAL_CLAUSES.map((clause) => (
                    <li key={clause}>{clause}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  )
}
