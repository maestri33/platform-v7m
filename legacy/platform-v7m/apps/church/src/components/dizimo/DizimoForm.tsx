import { Button } from '@/components/ui/button';
import type { DizimoError, PaymentMethod } from '@/api/contract';
import AmountInput from './AmountInput';
import MethodCards from './MethodCards';
import RecurrenceField from './RecurrenceField';

export interface DizimoFormState {
  amountCents: number;
  recurrenceEnabled: boolean;
  dayOfMonth: number;
  method: PaymentMethod | null;
}

export interface DizimoFormProps {
  form: DizimoFormState;
  errors: DizimoError[];
  canSubmit: boolean;
  submitError: string | null;
  onChange: (next: DizimoFormState) => void;
  onSubmit: () => void;
}

function SectionDivider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
  );
}

export default function DizimoForm({
  form,
  errors,
  canSubmit,
  submitError,
  onChange,
  onSubmit,
}: DizimoFormProps) {
  const fieldError = (code: string) =>
    errors.find((error) => error.code === code)?.message;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <span className="eyebrow">Contribuição</span>
        <h2 className="font-display text-3xl text-cream sm:text-4xl">
          Dízimo e ofertas
        </h2>
        <p className="text-sm text-cream-2">
          Sua generosidade sustenta a obra. Escolha um valor, defina se quer
          recorrência e selecione o método.
        </p>
      </header>

      <form
        aria-label="Formulário de contribuição"
        className="flex flex-col gap-6 rounded-sm border border-gold/20 bg-ink-2 p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit();
        }}
      >
        <RecurrenceField
          enabled={form.recurrenceEnabled}
          dayOfMonth={form.dayOfMonth}
          onEnabledChange={(recurrenceEnabled) =>
            onChange({ ...form, recurrenceEnabled })
          }
          onDayChange={(dayOfMonth) => onChange({ ...form, dayOfMonth })}
        />
        <SectionDivider />
        <AmountInput
          valueCents={form.amountCents}
          onChange={(amountCents) => onChange({ ...form, amountCents })}
          error={fieldError('INVALID_AMOUNT')}
        />
        <SectionDivider />

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-cream">
            Como você quer contribuir?
          </h2>
          <MethodCards
            selected={form.method}
            onSelect={(method) => onChange({ ...form, method })}
          />
        </div>

        {submitError && (
          <div
            className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            {submitError}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="h-12 w-full bg-gold text-ink transition-transform hover:bg-gold-light active:scale-[0.97] motion-reduce:transform-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continuar para pagamento
          </Button>
        </div>
      </form>
    </div>
  );
}

export { DizimoForm };
