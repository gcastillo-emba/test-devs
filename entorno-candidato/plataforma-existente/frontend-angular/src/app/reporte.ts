import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Fila {
  abogadoId: string;
  nombre: string;
  nivel: string;
  costoTotal: number;
  horasRegistradas: number;
  costoHora: number;
}

@Component({
  selector: 'app-reporte',
  imports: [DecimalPipe],
  template: `
    <label class="opcion">
      <input type="checkbox" [checked]="incluirSocios()" (change)="cambiarSocios($event)" /> Incluir socios
    </label>
    @if (error()) { <p class="error">No se pudo generar el reporte. {{ error() }}</p> }
    <div class="tarjeta">
      <p class="etiqueta">Costo promedio por hora de la firma</p>
      <p class="valor">Bs {{ promedio() | number: '1.2-2' }}</p>
    </div>
    <table>
      <thead><tr><th>Abogado</th><th>Nivel</th><th class="num">Horas</th><th class="num">Costo por hora</th></tr></thead>
      <tbody>
        @for (f of filas(); track f.abogadoId) {
          <tr><td>{{ f.nombre }}</td><td>{{ f.nivel }}</td><td class="num">{{ f.horasRegistradas }}</td>
              <td class="num">Bs {{ f.costoHora | number: '1.2-2' }}</td></tr>
        }
      </tbody>
    </table>
  `,
  styles: `
    .opcion { font-size: .875rem; color: #334155; }
    .error { margin-top: 1rem; color: #b91c1c; font-size: .875rem; }
    .tarjeta { margin-top: 1.5rem; border: 1px solid #e2e8f0; border-radius: .25rem; padding: 1rem; }
    .etiqueta { font-size: .875rem; color: #64748b; margin: 0; }
    .valor { font-size: 1.5rem; font-weight: 600; margin: .25rem 0 0; }
    table { margin-top: 1.5rem; width: 100%; border-collapse: collapse; font-size: .875rem; text-align: left; }
    th { color: #64748b; border-bottom: 1px solid #e2e8f0; padding: .5rem 0; }
    td { border-bottom: 1px solid #f1f5f9; padding: .5rem 0; }
    .num { text-align: right; }
  `,
})
export class Reporte {
  private readonly http = inject(HttpClient);
  readonly incluirSocios = signal(false);
  readonly filas = signal<Fila[]>([]);
  readonly error = signal<string | null>(null);
  readonly promedio = computed(() => {
    const filas = this.filas();
    return filas.length ? filas.reduce((suma, f) => suma + f.costoHora, 0) / filas.length : 0;
  });

  constructor() {
    this.cargar();
  }

  cambiarSocios(evento: Event) {
    this.incluirSocios.set((evento.target as HTMLInputElement).checked);
    this.cargar();
  }

  private cargar() {
    this.error.set(null);
    this.http.get<{ filas: Fila[] }>(`/api/reportes/costos?incluirSocios=${this.incluirSocios()}`).subscribe({
      next: (datos) => this.filas.set(datos.filas),
      error: (e) => {
        this.filas.set([]);
        this.error.set(`Error ${e.status}`);
      },
    });
  }
}
