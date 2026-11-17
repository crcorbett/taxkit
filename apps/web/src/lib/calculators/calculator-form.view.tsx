import type { CalculatorFormField } from "@taxkit/calculators/errors";
import type { AnnualTaxForm, TakeHomeForm } from "@taxkit/calculators/form";
import {
  Boolean as EffectBoolean,
  Function as EffectFunction,
  Option,
} from "effect";
import type { ReactNode } from "react";

import { buttonVariants } from "#/components/ui/button-variants";
import { Field, FieldLabel } from "#/components/ui/field";

// The visible field the current message belongs to.
type FieldError = Option.Option<
  Readonly<{ field: CalculatorFormField; message: string }>
>;
// A field's message and the element that carries it.
type FieldMessage = Option.Option<Readonly<{ anchor: string; text: string }>>;

const controlFor = (prefix: string, field: CalculatorFormField) =>
  `${prefix}-${field}`;

// Native invalid-field semantics: only the named field is marked invalid and
// described by its own message, which sits directly below it.
const messageFor = (
  prefix: string,
  error: FieldError,
  field: CalculatorFormField
): FieldMessage =>
  error.pipe(
    Option.filter((current) => current.field === field),
    Option.map(({ message }) => ({
      anchor: `${controlFor(prefix, field)}-error`,
      text: message,
    }))
  );

const describedBy = (message: FieldMessage) =>
  message.pipe(
    Option.map(({ anchor }) => anchor),
    Option.getOrUndefined
  );

const FieldMessageView = ({ message }: Readonly<{ message: FieldMessage }>) =>
  Option.isSome(message) && (
    <p className="field-error" id={message.value.anchor}>
      {message.value.text}
    </p>
  );

const MoneyInput = ({
  control,
  message,
  name,
  onChange,
  value,
}: Readonly<{
  control: string;
  message: FieldMessage;
  name: CalculatorFormField;
  onChange: (value: string) => void;
  value: string;
}>) => (
  // The shared Input contract on a native control: calculator pages need no
  // component runtime for a text field.
  <input
    aria-describedby={describedBy(message)}
    aria-invalid={Option.isSome(message) || undefined}
    autoComplete="off"
    data-slot="input"
    id={control}
    inputMode="decimal"
    name={name}
    onChange={(event) => {
      onChange(event.currentTarget.value);
    }}
    value={value}
  />
);

export const PayFields = ({
  error,
  fieldPrefix,
  form,
  onEdit,
}: Readonly<{
  error: FieldError;
  fieldPrefix: string;
  form: TakeHomeForm;
  onEdit: (form: TakeHomeForm) => void;
}>) => {
  const amount = messageFor(fieldPrefix, error, "grossDollars");
  const period = messageFor(fieldPrefix, error, "period");
  return (
    <>
      <Field>
        <FieldLabel htmlFor={controlFor(fieldPrefix, "grossDollars")}>
          Pay before tax ($)
        </FieldLabel>
        <MoneyInput
          control={controlFor(fieldPrefix, "grossDollars")}
          message={amount}
          name="grossDollars"
          onChange={(grossDollars) => {
            onEdit({ ...form, grossDollars });
          }}
          value={form.grossDollars}
        />
        <FieldMessageView message={amount} />
      </Field>
      <Field>
        <FieldLabel htmlFor={controlFor(fieldPrefix, "period")}>
          Pay period
        </FieldLabel>
        <select
          aria-describedby={describedBy(period)}
          aria-invalid={Option.isSome(period) || undefined}
          className="calculator-select"
          id={controlFor(fieldPrefix, "period")}
          name="period"
          onChange={(event) => {
            onEdit({ ...form, period: event.currentTarget.value });
          }}
          value={form.period}
        >
          <option value="weekly">Weekly</option>
          <option value="fortnightly">Fortnightly</option>
          <option value="monthly">Monthly</option>
        </select>
        <FieldMessageView message={period} />
      </Field>
      <label className="calculator-checkbox">
        <input
          checked={form.taxFreeThresholdClaimed}
          name="taxFreeThresholdClaimed"
          onChange={(event) => {
            onEdit({
              ...form,
              taxFreeThresholdClaimed: event.currentTarget.checked,
            });
          }}
          type="checkbox"
        />
        Claim the tax-free threshold
      </label>
    </>
  );
};

export const AnnualIncomeField = ({
  error,
  fieldPrefix,
  form,
  onEdit,
}: Readonly<{
  error: FieldError;
  fieldPrefix: string;
  form: AnnualTaxForm;
  onEdit: (form: AnnualTaxForm) => void;
}>) => {
  const income = messageFor(fieldPrefix, error, "taxableDollars");
  return (
    <Field>
      <FieldLabel htmlFor={controlFor(fieldPrefix, "taxableDollars")}>
        Annual taxable income ($)
      </FieldLabel>
      <MoneyInput
        control={controlFor(fieldPrefix, "taxableDollars")}
        message={income}
        name="taxableDollars"
        onChange={(taxableDollars) => {
          onEdit({ ...form, taxableDollars });
        }}
        value={form.taxableDollars}
      />
      <FieldMessageView message={income} />
    </Field>
  );
};

/**
 * The calculator form. Enter submits; the button is disabled while a
 * calculation runs, so one press makes one request. When the command reports
 * an invalid field, focus moves to that field so its message is announced.
 */
export const CalculatorFormView = ({
  busy,
  children,
  onCalculate,
}: Readonly<{
  busy: boolean;
  children: ReactNode;
  onCalculate: () => Option.Option<CalculatorFormField>;
}>) => (
  <form
    className="calculator-form"
    noValidate
    onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      EffectFunction.pipe(
        onCalculate(),
        Option.flatMap((field) =>
          Option.fromNullishOr(
            form.querySelector<HTMLElement>(`[name="${field}"]`)
          )
        ),
        Option.match({
          onNone: EffectFunction.constVoid,
          onSome: (element) => {
            element.focus();
          },
        })
      );
    }}
  >
    {children}
    <button {...buttonVariants()} disabled={busy} type="submit">
      {EffectBoolean.match(busy, {
        onFalse: (): "Calculate" => "Calculate",
        onTrue: (): "Calculating…" => "Calculating…",
      })}
    </button>
  </form>
);
