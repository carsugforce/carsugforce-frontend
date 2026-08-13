import {
  Directive,
  ElementRef,
  HostListener,
  forwardRef,
} from '@angular/core';

import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

@Directive({
  selector: 'input[appMoneyInput]',
  standalone: true,

  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(
        () => MoneyInputDirective,
      ),
      multi: true,
    },
  ],
})
export class MoneyInputDirective
  implements ControlValueAccessor
{
  private value = 0;

  private onChange:
    (value: number) => void = () => {};

  private onTouched:
    () => void = () => {};

  constructor(
    private element:
      ElementRef<HTMLInputElement>,
  ) {}

  // ============================================================
  // CONTROL VALUE ACCESSOR
  // ============================================================

  writeValue(
    value: number | null | undefined,
  ): void {
    this.value =
      this.normalizeNumber(value);

    this.renderValue();
  }

  registerOnChange(
    fn: (value: number) => void,
  ): void {
    this.onChange = fn;
  }

  registerOnTouched(
    fn: () => void,
  ): void {
    this.onTouched = fn;
  }

  setDisabledState(
    isDisabled: boolean,
  ): void {
    this.element.nativeElement.disabled =
      isDisabled;
  }

  // ============================================================
  // FOCUS
  // ============================================================

  @HostListener('focus')
  onFocus(): void {
    const input =
      this.element.nativeElement;

    // Si vale cero, seleccionamos el 0
    // para que al escribir lo reemplace.
    if (this.value === 0) {
      setTimeout(() => {
        input.select();
      });
    }
  }

  // ============================================================
  // INPUT
  // FORMATEA MIENTRAS ESCRIBES
  // ============================================================

  @HostListener(
    'input',
    ['$event'],
  )
  onInput(
    event: Event,
  ): void {
    const input =
      event.target as HTMLInputElement;

    const oldValue =
      input.value;

    const oldCaret =
      input.selectionStart ??
      oldValue.length;

    // Número de caracteres "reales"
    // antes del cursor, sin contar comas.
    const logicalCaretPosition =
      oldValue
        .substring(
          0,
          oldCaret,
        )
        .replace(
          /,/g,
          '',
        )
        .length;

    // Quitamos comas y cualquier cosa
    // que no sea dígito o punto.
    let raw =
      oldValue
        .replace(
          /,/g,
          '',
        )
        .replace(
          /[^\d.]/g,
          '',
        );

    // ==========================================================
    // SOLO UN PUNTO DECIMAL
    // ==========================================================

    const firstDot =
      raw.indexOf('.');

    if (firstDot >= 0) {
      const integerPart =
        raw.substring(
          0,
          firstDot,
        );

      const decimalPart =
        raw
          .substring(
            firstDot + 1,
          )
          .replace(
            /\./g,
            '',
          )
          .substring(
            0,
            2,
          );

      raw =
        `${integerPart}.${decimalPart}`;
    }

    // Si empieza con punto:
    // .50 => 0.50
    if (
      raw.startsWith('.')
    ) {
      raw = `0${raw}`;
    }

    // Si quedó vacío
    if (!raw) {
      this.value = 0;

      input.value = '';

      this.onChange(0);

      return;
    }

    const hasDecimal =
      raw.includes('.');

    const parts =
      raw.split('.');

    let integerPart =
      parts[0] || '0';

    const decimalPart =
      parts.length > 1
        ? parts[1]
        : '';

    // ==========================================================
    // QUITAR CEROS A LA IZQUIERDA
    // ==========================================================

    integerPart =
      integerPart.replace(
        /^0+(?=\d)/,
        '',
      );

    if (!integerPart) {
      integerPart = '0';
    }

    // ==========================================================
    // METER COMAS
    // ==========================================================

    const formattedInteger =
      integerPart.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ',',
      );

    const formatted =
      hasDecimal
        ? `${formattedInteger}.${decimalPart}`
        : formattedInteger;

    input.value =
      formatted;

    // ==========================================================
    // VALOR REAL DEL FORM CONTROL
    // ==========================================================

    const parsed =
      Number(raw);

    this.value =
      Number.isFinite(parsed)
        ? parsed
        : 0;

    this.onChange(
      this.value,
    );

    // ==========================================================
    // RECUPERAR POSICIÓN DEL CURSOR
    // ==========================================================

    const newCaret =
      this.getCaretPosition(
        formatted,
        logicalCaretPosition,
      );

    requestAnimationFrame(
      () => {
        input.setSelectionRange(
          newCaret,
          newCaret,
        );
      },
    );
  }

  // ============================================================
  // BLUR
  // ============================================================

  @HostListener('blur')
  onBlur(): void {
    this.renderValue();

    this.onTouched();
  }

  // ============================================================
  // RENDER
  // ============================================================

  private renderValue(): void {
    const input =
      this.element.nativeElement;

    input.value =
      new Intl.NumberFormat(
        'en-US',
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        },
      ).format(
        this.value,
      );
  }

  // ============================================================
  // CURSOR
  // ============================================================

  private getCaretPosition(
    formattedValue: string,
    logicalPosition: number,
  ): number {
    let logicalCount = 0;

    for (
      let i = 0;
      i < formattedValue.length;
      i++
    ) {
      if (
        formattedValue[i] !== ','
      ) {
        logicalCount++;
      }

      if (
        logicalCount >=
        logicalPosition
      ) {
        return i + 1;
      }
    }

    return formattedValue.length;
  }

  // ============================================================
  // NORMALIZE
  // ============================================================

  private normalizeNumber(
    value: unknown,
  ): number {
    const parsed =
      Number(
        String(
          value ?? 0,
        ).replace(
          /,/g,
          '',
        ),
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : 0;
  }
}