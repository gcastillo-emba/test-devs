import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Abogado {
  id: string;
  nombre: string;
  nivel: string;
}

@Component({
  selector: 'app-ficha',
  imports: [DecimalPipe],
  template: `
    <select [value]="seleccionado()" (change)="elegir($event)">
      @for (a of abogados(); track a.id) { <option [value]="a.id">{{ a.nombre }} · {{ a.nivel }}</option> }
    </select>
    @if (error()) { <p class="error">No se pudo calcular el costo. {{ error() }}</p> }
    @if (costoHora() !== null) {
      <div class="tarjeta">
        <p class="etiqueta">Costo por hora</p>
        <p class="valor">Bs {{ costoHora() | number: '1.2-2' }}</p>
      </div>
    }
  `,
  styles: `
    select { border: 1px solid #cbd5e1; border-radius: .25rem; padding: .5rem .75rem; font-size: .875rem; }
    .error { margin-top: 1rem; color: #b91c1c; font-size: .875rem; }
    .tarjeta { margin-top: 1.5rem; border: 1px solid #e2e8f0; border-radius: .25rem; padding: 1rem; }
    .etiqueta { font-size: .875rem; color: #64748b; margin: 0; }
    .valor { font-size: 1.5rem; font-weight: 600; margin: .25rem 0 0; }
  `,
})
export class Ficha {
  private readonly http = inject(HttpClient);
  readonly abogados = signal<Abogado[]>([]);
  readonly seleccionado = signal('A-01');
  readonly costoHora = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    this.http.get<Abogado[]>('/api/abogados').subscribe((lista) => this.abogados.set(lista));
    this.cargar();
  }

  elegir(evento: Event) {
    this.seleccionado.set((evento.target as HTMLSelectElement).value);
    this.cargar();
  }

  private cargar() {
    this.error.set(null);
    this.http.get<{ costoHora: number }>(`/api/abogados/${this.seleccionado()}/costo-hora`).subscribe({
      next: (datos) => this.costoHora.set(datos.costoHora),
      error: (e) => {
        this.costoHora.set(null);
        this.error.set(`Error ${e.status}`);
      },
    });
  }
}
