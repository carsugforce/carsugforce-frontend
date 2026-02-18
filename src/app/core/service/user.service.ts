import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface UserListItem {
  id: string;
  userName: string;
  email: string;
  role: string;
}


@Injectable({ providedIn: 'root' })
export class UserService {

  private apiUsers = `${environment.apiUrl}/users`;
  private apiAuth  = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  
  getAll() {
    return this.http.get<any[]>(`${this.apiUsers}/all`, {
      withCredentials: true
    });
  }

  
  create(user: any) {
    return this.http.post(`${this.apiUsers}/create`, user, {
      withCredentials: true
    });
  }
  
  delete(id: string) {
    return this.http.delete(`${this.apiUsers}/${id}`, {
      withCredentials: true
    });
  }

  update(id: string, user: any) {
  return this.http.put(
    `${this.apiUsers}/${id}`,
    user,
    { withCredentials: true }
  );
}


  updateDarkMode(enabled: boolean) {
    return this.http.put(`${this.apiUsers}/darkmode`, { enabled }, {
      withCredentials: true
    });
  }

  getMe() {
    return this.http.get(`${this.apiAuth}/me`, {
      withCredentials: true
    });
  }
}

