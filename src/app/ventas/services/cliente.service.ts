import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Client } from '../models/client.model';
import { MOCK_CLIENTS } from './mock-data';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private clientsSubject = new BehaviorSubject<Client[]>(MOCK_CLIENTS);
  public clients$: Observable<Client[]> = this.clientsSubject.asObservable();

  constructor() {}

  getClients(): Observable<Client[]> {
    // Simulating REST API delay
    return this.clients$.pipe(delay(200));
  }

  getClientById(id: string): Observable<Client | undefined> {
    return this.clients$.pipe(
      delay(150),
      map(clients => clients.find(c => c.id === id))
    );
  }

  searchClients(term: string): Observable<Client[]> {
    return this.clients$.pipe(
      delay(100),
      map(clients => {
        if (!term) return clients;
        const normalizedTerm = term.toLowerCase().trim();
        return clients.filter(c => 
          c.name.toLowerCase().includes(normalizedTerm) ||
          c.rfc.toLowerCase().includes(normalizedTerm) ||
          c.phone.includes(normalizedTerm)
        );
      })
    );
  }

  addClient(client: Omit<Client, 'id'>): Observable<Client> {
    // Generate new client
    const newClient: Client = {
      ...client,
      id: 'c' + (this.clientsSubject.value.length + 1)
    };
    
    // Simulate API request
    return of(newClient).pipe(
      delay(300),
      map(c => {
        const current = this.clientsSubject.value;
        this.clientsSubject.next([...current, c]);
        return c;
      })
    );
  }
}
