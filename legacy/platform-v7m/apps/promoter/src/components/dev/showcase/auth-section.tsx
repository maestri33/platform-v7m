"use client";

/**
 * Os 3 estágios do CheckFlow renderizados lado a lado. O `dev-preview/page.tsx`
 * detecta `section=auth` e renderiza esta seção FORA do AppShell, dentro de
 * um `<AuthShell>` (header/footer + fundo animado da auth). Ela é o único
 * caso em que o dev-preview não usa o container AppShell.
 *
 * Importante: NÃO importa `AuthShell` aqui — quem envolve é a page.
 */
export function AuthSection() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <StageBlock
        number="1"
        title="check"
        description="Candidato entra com o telefone. Se não existir, vai pro register (2)."
      >
        <CheckPhone />
      </StageBlock>
      <StageBlock
        number="2"
        title="register"
        description="Cpf + e-mail + telefone. Cria a conta, segue pro otp (3)."
      >
        <Register />
      </StageBlock>
      <StageBlock
        number="3"
        title="otp"
        description="Código de 6 dígitos enviado por WhatsApp. Sucesso → /painel."
      >
        <Otp />
      </StageBlock>
    </div>
  );
}

function StageBlock({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-gold/15 font-display text-sm font-bold text-brand-gold-light">
          {number}
        </span>
        <div>
          <h2 className="font-display text-base text-white">{title}</h2>
          <p className="text-xs text-[var(--muted-on-dark)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

// =============================================================================
// Estágios estáticos (espelho do CheckFlow, sem submit / useState)
// =============================================================================

function CheckPhone() {
  return (
    <div className="auth-card">
      <div className="text-center">
        <h2 className="text-[21px] font-bold text-white">Passa seu WhatsApp pra mim?</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted-on-dark)]">
          Pode ficar sossegado — é só pra confirmar seu acesso. Sem cadastro? A gente cria na hora.
        </p>
      </div>
      <div className="gold-divider my-4" />
      <div className="mx-auto max-w-[17.5rem]">
        <p className="label">Telefone (WhatsApp)</p>
        <div className="relative">
          <span className="phone-prefix">+55</span>
          <input
            className="input text-center text-[16.5px] tabular-nums pl-16"
            placeholder="(11) 98765-4321"
            defaultValue="(11) 98765-4321"
          />
        </div>
      </div>
      <button className="btn btn-xl w-full mt-4">Continuar</button>
    </div>
  );
}

function Register() {
  return (
    <div className="auth-card space-y-4">
      <div className="text-center">
        <h2 className="text-[21px] font-bold text-white">Criar cadastro</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted-on-dark)]">
          Este número ainda não possui cadastro. Confirme seus dados para continuar.
        </p>
      </div>
      <div className="gold-divider" />
      <div>
        <p className="label">Telefone (WhatsApp)</p>
        <div className="input flex items-center text-white/70">(11) 98765-4321</div>
        <p className="mt-2 text-[12.5px] text-[var(--muted-on-dark)]">O código de confirmação será enviado para este número.</p>
      </div>
      <div>
        <p className="label">CPF</p>
        <input className="input" placeholder="000.000.000-00" defaultValue="123.456.789-09" />
      </div>
      <div>
        <p className="label">E-mail</p>
        <input className="input" type="email" placeholder="voce@email.com" defaultValue="bia@exemplo.com" />
      </div>
      <button className="btn btn-xl w-full">Criar cadastro</button>
    </div>
  );
}

function Otp() {
  return (
    <div className="auth-card space-y-4">
      <div className="text-center">
        <h2 className="text-[21px] font-bold text-white">Confirme o código</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted-on-dark)]">
          Enviamos um código de 6 dígitos para o WhatsApp <strong className="text-white">(11) 98765-4321</strong>.
        </p>
      </div>
      <div className="gold-divider" />
      <div className="flex justify-center gap-2" aria-hidden>
        {["1", "2", "3", "4", "5", "6"].map((d, i) => {
          const filled = i < 3;
          return (
            <div key={i} className="otp-slot" data-state={filled ? "filled" : i === 3 ? "active" : "empty"}>
              {filled ? d : ""}
              {i === 3 && !filled && <span className="otp-caret" />}
            </div>
          );
        })}
      </div>
      <button className="btn btn-xl w-full">Entrar</button>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          disabled
          className="min-h-[44px] rounded-full border border-[rgb(var(--gold-rgb)_/_0.4)] px-4 text-[13px] font-semibold text-brand-gold-light opacity-55 cursor-not-allowed"
        >
          Reenviar código (47s)
        </button>
        <button type="button" className="min-h-[44px] px-3 text-[13px] text-[var(--muted-on-dark)] hover:text-white">
          Outro número
        </button>
      </div>
    </div>
  );
}
