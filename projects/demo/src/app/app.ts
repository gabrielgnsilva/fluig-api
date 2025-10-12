/** @format */

import { JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { FluigAPIService } from 'fluig-api';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [JsonPipe],
  template: `
    <h1 style="color: #ddd">Fluig API Demo</h1>
    <div
      style="display: flex; flex-direction: row; gap: 1rem; margin-bottom: 1rem"
    >
      <button (click)="getCurrentUserGroups()">Get current user</button>
      <button (click)="createDir(parentId(), 'OAuth Dir')">
        Create new "OAuth Dir - {{ dirId() }}" directory
      </button>
    </div>
    @if (userGroups() !== null) {
      <div style="color: #ddd">
        <h2>Current user groups:</h2>
        <pre>{{ userGroups() | json }}</pre>
      </div>
    }
  `,
})
export class App {
  private readonly dRef = inject(DestroyRef);
  private readonly http = inject(HttpClient);
  private readonly fluigAPI = inject(FluigAPIService);

  protected readonly parentId = signal(6);
  protected readonly dirId = signal(1);
  protected readonly userGroups = signal<string[] | null>(null);

  protected createDir(parentId: number, dirName: string) {
    this.http
      .post(`/content-management/api/v2/folders/${parentId}`, {
        alias: `${dirName}-${this.dirId()}`,
      })
      .subscribe({
        next: (res) => console.log(res),
        complete: () => this.dirId.set(this.dirId() + 1),
        error: () => console.error('Error creating directory'),
      });
  }

  protected getCurrentUserGroups() {
    this.fluigAPI
      .get<{ content: { groups: string[] } }>(
        '/api/public/2.0/users/getCurrent'
      )
      .pipe(
        map((data) => data.content.groups),
        takeUntilDestroyed(this.dRef)
      )
      .subscribe({
        next: (res) => {
          this.userGroups.set(res);
          console.log(res);
        },
        complete: () => console.log('Successfully loaded user groups'),
        error: () => console.error('Error loading user groups'),
      });
  }
}
