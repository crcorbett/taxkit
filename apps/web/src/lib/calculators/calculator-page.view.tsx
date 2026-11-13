import { Option } from "effect";
import type { ReactNode } from "react";

// The calculator page frame: its title is the page heading, followed by its
// context, the form and the answer.
export const CalculatorPageView = ({
  children,
  message,
  result,
  title,
  year,
}: Readonly<{
  children: ReactNode;
  message: Option.Option<string>;
  result: ReactNode;
  title: string;
  year: string;
}>) => (
  <section className="calculator-page" aria-labelledby="calculator-title">
    <header className="calculator-header">
      <h1 id="calculator-title">{title}</h1>
      <p>{year} tax year · Australia</p>
    </header>
    <noscript>
      <p role="alert">Turn on JavaScript to use this calculator.</p>
    </noscript>
    {children}
    {Option.isSome(message) && (
      <p className="calculator-alert" role="alert">
        {message.value}
      </p>
    )}
    {result}
  </section>
);
